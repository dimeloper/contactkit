export interface MailInput {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export interface Mailer {
  send(input: MailInput): Promise<{ id?: string }>;
}
