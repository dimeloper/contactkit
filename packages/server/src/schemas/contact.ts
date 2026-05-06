import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
  /** Cloudflare Turnstile token — optional, validated server-side when TURNSTILE_SECRET is set */
  turnstileToken: z.string().optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;
