import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parseEnv } from './env.js';
import { healthRoutes } from './routes/health.js';
import { contactRoutes } from './routes/contact.js';
import { ResendMailer } from './mailer/resend.js';
import { SmtpMailer } from './mailer/smtp.js';
import type { Mailer } from './mailer/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as {
  name: string;
  version: string;
};

export async function buildApp(overrideEnv?: NodeJS.ProcessEnv) {
  const env = parseEnv(overrideEnv ?? process.env);

  const app = Fastify({
    logger: env.NODE_ENV !== 'test' ? { level: env.LOG_LEVEL } : false,
    trustProxy: true,
    bodyLimit: 16 * 1024, // 16 KB
  });

  // CORS
  const allowedOrigins =
    env.ALLOWED_ORIGINS === '*' ? true : env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  await app.register(cors, { origin: allowedOrigins });

  // Rate limiting (global defaults; route-level overrides applied per route)
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    keyGenerator: (request) => request.ip,
  });

  // Mailer factory
  let mailer: Mailer;
  if (env.EMAIL_PROVIDER === 'smtp') {
    mailer = new SmtpMailer({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT!,
      secure: env.SMTP_SECURE ?? false,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  } else {
    mailer = new ResendMailer(env.RESEND_API_KEY!);
  }

  // Root info endpoint
  app.get('/', async (_request, reply) => {
    return reply.send({ name: pkg.name, version: pkg.version });
  });

  // Routes
  await app.register(healthRoutes);
  await app.register(contactRoutes, { mailer, env });

  return { app, env };
}

// Only start the server when this file is run directly
const isMain =
  process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { app, env } = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
}
