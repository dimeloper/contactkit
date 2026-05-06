# contactkit

Self-hostable contact form backend with a zero-dependency TypeScript SDK. Resend by default, SMTP optional, one-click Railway deploy.

<!-- TODO: replace the template URL below after the first deploy -->
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/contactkit)
[![CI](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml/badge.svg)](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Quickstart

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

## Monorepo layout

```
contactkit/
├── packages/
│   ├── server/            # @contactkit/server — Fastify backend
│   └── client/            # @contactkit/client — TypeScript SDK
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
└── prettier.config.js
```

## Environment variable reference

See [`packages/server/.env.example`](packages/server/.env.example) for a copy-pasteable file.

| Variable | Required | Default | Description |
|---|---|---|---|
| `EMAIL_PROVIDER` | – | `resend` | `resend` or `smtp` |
| `RESEND_API_KEY` | When `EMAIL_PROVIDER=resend` | – | Resend API key |
| `SMTP_HOST` | When `EMAIL_PROVIDER=smtp` | – | SMTP server hostname |
| `SMTP_PORT` | When `EMAIL_PROVIDER=smtp` | – | SMTP server port |
| `SMTP_USER` | – | – | SMTP auth username |
| `SMTP_PASS` | – | – | SMTP auth password |
| `SMTP_SECURE` | – | `false` | Use TLS (`true`/`false`) |
| `MAIL_TO` | ✓ | – | Recipient address for submissions |
| `MAIL_FROM` | ✓ | – | Verified sender address |
| `MAIL_SUBJECT_PREFIX` | – | `[Contact]` | Prefix prepended to every email subject |
| `ALLOWED_ORIGINS` | – | `*` | Comma-separated allowed CORS origins |
| `RATE_LIMIT_MAX` | – | `5` | Max requests per window |
| `RATE_LIMIT_WINDOW` | – | `60000` | Rate-limit window in milliseconds |
| `TURNSTILE_SECRET` | – | – | Cloudflare Turnstile secret key (omit to disable) |
| `PORT` | – | `3000` | HTTP listen port |
| `HOST` | – | `0.0.0.0` | HTTP listen host |
| `NODE_ENV` | – | `production` | `development` / `production` / `test` |
| `LOG_LEVEL` | – | `info` | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |

## Provider setup

### Resend

1. Create a free account at [resend.com](https://resend.com).
2. Verify your sending domain (**Domains → Add domain** and add the DNS records shown).
3. Create an API key under **API Keys** and set it as `RESEND_API_KEY`.
4. Set `MAIL_FROM` to an address on your verified domain (e.g. `noreply@yourdomain.com`).

### SMTP

Common examples:

```env
# Gmail (App Password required — enable 2FA first)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password

# Mailhog (local dev)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

> **Note:** Additional providers (Postmark, SendGrid, Mailgun) are planned — see TODOs in `packages/server/src/mailer/`.

## Self-host notes

### CORS

Set `ALLOWED_ORIGINS` to a comma-separated list of your front-end origins:

```env
ALLOWED_ORIGINS=https://www.example.com,https://example.com
```

Use `*` only in local development.

### Rate limiting

`RATE_LIMIT_MAX` requests are allowed per `RATE_LIMIT_WINDOW` milliseconds **per IP**. The server trusts `X-Forwarded-For` headers (Railway sets these automatically).

### Turnstile (bot protection)

1. Add a Cloudflare Turnstile widget to your form. Obtain the site key and secret key from the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Set `TURNSTILE_SECRET` on the server. Once set, every submission must include a valid `turnstileToken`.
3. Pass the token from your frontend:

```ts
await client.send({
  name, email, message,
  turnstileToken: turnstileWidgetResponse,
});
```

## Development

```bash
# Install dependencies
pnpm install

# Run the server in dev mode
pnpm --filter @contactkit/server dev

# Run tests
pnpm test

# Build all packages
pnpm build

# Lint
pnpm lint
```

## License

[MIT](LICENSE) © dimeloper
