import { Resend } from 'resend';
import type { Mailer, MailInput } from './index.js';

export class ResendMailer implements Mailer {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(input: MailInput): Promise<{ id?: string }> {
    const { data, error } = await this.client.emails.send({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return { id: data?.id };
  }
}
