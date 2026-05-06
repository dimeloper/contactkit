import { Resend } from 'resend';
import type { Mailer, MailOptions } from './index.js';

export class ResendMailer implements Mailer {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(options: MailOptions): Promise<void> {
    const { error } = await this.client.emails.send({
      from: options.from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
