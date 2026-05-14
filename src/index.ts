import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readTurnstileTokenFromUrl, verifyTurnstileToken } from '../../_shared/turnstile';
import { renderTextToolPage, turnstileSiteKeyFromEnv } from '../../_shared/tool-page';

type Env = { Bindings: { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string } };

const app = new Hono<Env>();
app.use('/api/*', cors());
app.get('/', (c) =>
  c.html(
    renderTextToolPage({
      title: 'Redirect Checker',
      description: 'Follow redirect chains and see status codes, hops, and the final destination.',
      endpoint: '/api/check',
      sample: '{ "url": "https://example.com", "chain": [], "finalUrl": "...", "hops": 0 }',
      siteKey: turnstileSiteKeyFromEnv(c.env),
      buttonLabel: 'Check',
      toolSlug: 'redirect-checker',
    })
  )
);
app.get('/health', (c) => c.json({ ok: true }));
app.get('/api/check', async (c) => {
  const captcha = await verifyTurnstileToken(
    c.env,
    readTurnstileTokenFromUrl(c.req.url),
    c.req.header('CF-Connecting-IP')
  );
  if (!captcha.ok) return c.json({ error: captcha.error }, 403);

  let normalized = normalizeUrl(c.req.query('url') ?? '');
  if (!normalized) return c.json({ error: 'A valid http(s) URL is required.' }, 400);

  const chain: { url: string; status: number }[] = [];
  const maxHops = 10;
  let hops = 0;
  let current = normalized;

  while (hops < maxHops) {
    const response = await fetch(current, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'user-agent': 'Lindo Redirect Checker/0.1' },
    }).catch(() => null);

    if (!response) {
      chain.push({ url: current, status: 0 });
      break;
    }

    chain.push({ url: current, status: response.status });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      try {
        current = new URL(location, current).toString();
      } catch {
        break;
      }
      hops++;
      continue;
    }
    break;
  }

  return c.json({ url: normalized, chain, hops: chain.length - 1, finalUrl: current });
});

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).toString();
  } catch {
    return null;
  }
}

export default app;
