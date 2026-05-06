import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Mailer selection
  MAILER: z.enum(['resend', 'smtp']).default('resend'),

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
  FROM_EMAIL: z.string().email().default('noreply@example.com'),
  TO_EMAIL: z.string().email(),

  // Cloudflare Turnstile (optional)
  TURNSTILE_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}
