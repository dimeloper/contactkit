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
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = contactSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const { name, email, message, turnstileToken } = parseResult.data;

      // Bot protection
      const turnstileResult = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET);
      if (!turnstileResult.success) {
        return reply.status(403).send({
          error: 'Bot verification failed',
          codes: turnstileResult.errorCodes,
        });
      }

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeMessage = escapeHtml(message);

      const subject = `New contact form message from ${name}`;
      const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
      const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <h3>Message</h3>
      <p>${safeMessage.replace(/\n/g, '<br/>')}</p>
    `;

      try {
        await mailer.send({
          from: env.FROM_EMAIL,
          to: env.TO_EMAIL,
          subject,
          text,
          html,
        });
      } catch (err) {
        app.log.error({ err }, 'Failed to send contact email');
        return reply
          .status(500)
          .send({ error: 'Failed to send message. Please try again later.' });
      }

      return reply.status(200).send({ ok: true });
    },
  );
}
