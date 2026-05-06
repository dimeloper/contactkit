import { ContactKitError, NetworkError } from './errors.js';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  /** Optional Cloudflare Turnstile token */
  turnstileToken?: string;
}

export interface ContactKitOptions {
  /** Base URL of the @contactkit/server instance, e.g. "https://contactkit.example.com" */
  baseUrl: string;
  /** Optional fetch implementation for environments without native fetch (e.g. Node <18) */
  fetchFn?: typeof fetch;
}

export class ContactKitClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ContactKitOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async submit(payload: ContactPayload): Promise<void> {
    let response: Response;

    try {
      response = await this.fetchFn(`${this.baseUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new NetworkError('Failed to reach the ContactKit server', err);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new ContactKitError(
        `ContactKit server responded with ${response.status}`,
        response.status,
        body,
      );
    }
  }
}
