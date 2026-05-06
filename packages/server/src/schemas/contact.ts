import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  /** Honeypot — any non-empty value means the request is spam */
  website: z.string().max(0).optional(),
  /** Cloudflare Turnstile token — optional, validated server-side when TURNSTILE_SECRET is set */
  turnstileToken: z.string().optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;
