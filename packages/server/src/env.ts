import { z } from 'zod';

const baseEnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // CORS — comma-separated list of allowed origins, or "*" for all
  ALLOWED_ORIGINS: z.string().default('*'),

  // Email provider selection
  EMAIL_PROVIDER: z.enum(['resend', 'smtp']).default('resend'),

  // Resend
  RESEND_API_KEY: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  // Email addressing
  MAIL_FROM: z.string().email(),
  MAIL_TO: z.string().email(),
  MAIL_SUBJECT_PREFIX: z.string().default('[Contact]'),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(5),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),

  // Cloudflare Turnstile (optional)
  TURNSTILE_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof baseEnvSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const baseResult = baseEnvSchema.safeParse(raw);
  if (!baseResult.success) {
    const formatted = baseResult.error.format();
    throw new Error(`Invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`);
  }

  const env = baseResult.data;

  // Conditional validation
  if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }
  if (env.EMAIL_PROVIDER === 'smtp') {
    if (!env.SMTP_HOST) throw new Error('SMTP_HOST is required when EMAIL_PROVIDER=smtp');
    if (env.SMTP_PORT === undefined)
      throw new Error('SMTP_PORT is required when EMAIL_PROVIDER=smtp');
  }

  return env;
}
