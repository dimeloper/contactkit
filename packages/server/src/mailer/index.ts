export interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(options: MailOptions): Promise<void>;
}
