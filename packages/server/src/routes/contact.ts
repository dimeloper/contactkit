import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { contactSchema } from '../schemas/contact.js';
import type { Mailer } from '../mailer/index.js';
import type { Env } from '../env.js';
import { verifyTurnstile } from '../lib/turnstile.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function contactRoutes(
  app: FastifyInstance,
  options: { mailer: Mailer; env: Env },
): Promise<void> {
  const { mailer, env } = options;

  app.post(
    '/contact',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_MAX,
          timeWindow: env.RATE_LIMIT_WINDOW,
          keyGenerator: (request) => request.ip,
        },
      },
    },
    async (request, reply) => {
      // Honeypot check before schema validation — silently succeed to avoid leaking info to bots
      const rawBody = request.body as Record<string, unknown>;
      if (rawBody && typeof rawBody.website === 'string' && rawBody.website.length > 0) {
        app.log.debug({ ip: request.ip }, 'Honeypot triggered — discarding submission');
        return reply.status(200).send({ ok: true, id: randomUUID() });
      }

      const parseResult = contactSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const { name, email, subject, message, turnstileToken } = parseResult.data;

      // Turnstile verification
      const turnstileResult = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET);
      if (!turnstileResult.success) {
        return reply.status(400).send({
          error: 'CAPTCHA verification failed',
          codes: turnstileResult.errorCodes,
        });
      }

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = subject ? escapeHtml(subject) : undefined;
      const safeMessage = escapeHtml(message);

      const emailSubject = `${env.MAIL_SUBJECT_PREFIX} ${subject ?? 'New submission'}`;
      const text = [
        `Name: ${name}`,
        `Email: ${email}`,
        subject ? `Subject: ${subject}` : null,
        '',
        'Message:',
        message,
      ]
        .filter((line) => line !== null)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Contact Form Submission</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#333">New Contact Form Submission</h2>
  <p><strong>Name:</strong> ${safeName}</p>
  <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
  ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ''}
  <h3 style="color:#555">Message</h3>
  <p style="white-space:pre-wrap">${safeMessage.replace(/\n/g, '<br/>')}</p>
</body>
</html>`;

      let id: string;
      try {
        const result = await mailer.send({
          from: env.MAIL_FROM,
          to: env.MAIL_TO,
          subject: emailSubject,
          text,
          html,
          replyTo: email,
        });
        id = result.id ?? randomUUID();
      } catch (err) {
        app.log.error({ err }, 'Failed to send contact email');
        return reply
          .status(500)
          .send({ error: 'Failed to send message. Please try again later.' });
      }

      return reply.status(200).send({ ok: true, id });
    },
  );
}
