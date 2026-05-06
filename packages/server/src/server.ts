import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { parseEnv } from './env.js';
import { healthRoutes } from './routes/health.js';
import { contactRoutes } from './routes/contact.js';
import { ResendMailer } from './mailer/resend.js';
import { SmtpMailer } from './mailer/smtp.js';
import type { Mailer } from './mailer/index.js';

export async function buildApp(overrideEnv?: NodeJS.ProcessEnv) {
  const env = parseEnv(overrideEnv ?? process.env);

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
  });

  // Mailer factory
  let mailer: Mailer;
  if (env.MAILER === 'smtp') {
    if (!env.SMTP_HOST || env.SMTP_PORT === undefined) {
      throw new Error('SMTP_HOST and SMTP_PORT are required when MAILER=smtp');
    }
    mailer = new SmtpMailer({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? false,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  } else {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required when MAILER=resend');
    }
    mailer = new ResendMailer(env.RESEND_API_KEY);
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(contactRoutes, { mailer, env });

  return { app, env };
}

// Only start the server when this file is run directly
const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { app, env } = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
}
