# Redirect Checker

Follow redirect chains and see status codes, hops, and the final destination.

## API

```
GET /api/check?url=https://example.com
```

Returns the redirect chain with status codes and final URL.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lindoai/redirect-checker)

## Environment

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
