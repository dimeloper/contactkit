# contactkit

Self-hostable contact form backend with a zero-dependency TypeScript SDK.
Default email provider is Resend, SMTP is supported, and Railway deployment steps are included below.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/contactkit)
[![CI](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml/badge.svg)](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Quickstart (Run this repo locally)

This gets the API running locally and verifies it end-to-end.

### 1. Prerequisites

- Node.js 20+
- pnpm 9+

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp packages/server/.env.example packages/server/.env
```

Set the minimum required variables in `packages/server/.env`:

Resend example:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
MAIL_TO=you@example.com
MAIL_FROM=noreply@yourdomain.com
```

SMTP (Mailhog/local) example:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_TO=you@example.com
MAIL_FROM=noreply@example.com
```

### 4. Start the server

```bash
pnpm --filter @contactkit/server dev
```

By default, the server starts at `http://localhost:3000`.

### 5. Smoke test

Health endpoint:

```bash
curl -s http://localhost:3000/health
```

Contact endpoint (works as-is when `TURNSTILE_SECRET` is not set):

```bash
curl -s -X POST http://localhost:3000/contact \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane",
    "email": "jane@example.com",
    "message": "Hello from curl"
  }'
```

## Deploy on Railway

### Option A: Deploy button

Use the button at the top of this README if the public template is available.
If it is unavailable, use Option B.

### Option B: Manual deploy

1. Create a new project in Railway and connect this repository.
2. Set the root directory to `packages/server`.
3. Add environment variables in Railway:
   - Required: `MAIL_TO`, `MAIL_FROM`
   - Provider-specific:
     - Resend: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=...`
     - SMTP: `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, optional `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`
   - Recommended: `ALLOWED_ORIGINS=https://your-frontend-domain.com`
4. Deploy the service.
5. Verify the deployment:

```bash
curl -s https://your-app.up.railway.app/health
```

## SDK Quickstart

### Browser

```html
<script type="module">
  import { ContactClient } from 'https://cdn.jsdelivr.net/npm/@contactkit/client/dist/index.js';

  const client = new ContactClient({ baseUrl: 'https://contact.example.com' });

  await client.send({
    name: 'Jane',
    email: 'jane@example.com',
    message: 'Hello!',
    subject: 'Inquiry',        // optional
    turnstileToken: '...',     // optional
  });
</script>
```

### Node / Edge

```ts
import { ContactClient, ContactError } from '@contactkit/client';

const client = new ContactClient({
  baseUrl: 'https://contact.example.com',
  timeoutMs: 10_000, // optional, default 10 s
});

try {
  const { id } = await client.send({
    name: 'Jane',
    email: 'jane@example.com',
    message: 'Hello from Node!',
  });
  console.log('Sent, message id:', id);
} catch (err) {
  if (err instanceof ContactError) {
    console.error(err.code, err.status); // e.g. "validation" 400
  }
}
```

## Configuration at a glance

- Full env reference: [packages/server/.env.example](packages/server/.env.example)
- Required in all environments: `MAIL_TO`, `MAIL_FROM`
- Provider selection: `EMAIL_PROVIDER=resend` (default) or `EMAIL_PROVIDER=smtp`
- Resend requires: `RESEND_API_KEY`
- SMTP requires: `SMTP_HOST`, `SMTP_PORT` (plus optional auth and TLS flags)
- Security/ops knobs: `ALLOWED_ORIGINS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, optional `TURNSTILE_SECRET`

## Useful commands

```bash
pnpm test
pnpm build
pnpm lint
```

## License

[MIT](LICENSE) © dimeloper
