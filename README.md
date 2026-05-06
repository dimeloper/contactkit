# contactkit

Self-hostable contact form backend with a zero-dependency TypeScript SDK. Resend by default, SMTP optional, one-click Railway deploy.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/contactkit)
[![CI](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml/badge.svg)](https://github.com/dimeloper/contactkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

**contactkit** is a TypeScript pnpm monorepo containing two packages:

| Package | Description |
|---|---|
| [`@contactkit/server`](packages/server) | Fastify backend that accepts contact-form submissions and sends email via [Resend](https://resend.com) (default) or SMTP |
| [`@contactkit/client`](packages/client) | Tiny, framework-agnostic TypeScript SDK that posts to the server |

## Quick start

### 1. Deploy the server to Railway

Click the button above, or follow the [Railway deploy guide](https://docs.railway.app).

Set the required environment variables (see [`packages/server/.env.example`](packages/server/.env.example)):

```
MAILER=resend              # or smtp
RESEND_API_KEY=re_...      # required when MAILER=resend
TO_EMAIL=you@example.com   # where contact submissions land
FROM_EMAIL=noreply@...     # verified sender address
```

### 2. Install the client SDK

```bash
npm install @contactkit/client
# or
pnpm add @contactkit/client
```

### 3. Use the client

```ts
import { ContactKitClient } from '@contactkit/client';

const client = new ContactKitClient({ baseUrl: 'https://your-contactkit.railway.app' });

await client.submit({
  name: 'Alice',
  email: 'alice@example.com',
  message: 'Hello from the contact form!',
});
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

## Environment variables

See [`packages/server/.env.example`](packages/server/.env.example) for the full list.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAILER` | – | `resend` | `resend` or `smtp` |
| `RESEND_API_KEY` | When `MAILER=resend` | – | Resend API key |
| `SMTP_HOST` | When `MAILER=smtp` | – | SMTP server hostname |
| `SMTP_PORT` | When `MAILER=smtp` | – | SMTP server port |
| `TO_EMAIL` | ✓ | – | Recipient email address |
| `FROM_EMAIL` | – | `noreply@example.com` | Sender email address |
| `TURNSTILE_SECRET` | – | – | Cloudflare Turnstile secret (omit to disable) |
| `CORS_ORIGIN` | – | `*` | Comma-separated allowed origins |

## License

[MIT](LICENSE) © dimeloper
