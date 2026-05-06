import { ContactError, NetworkError } from './errors.js';
import type { ContactErrorCode } from './errors.js';

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  subject?: string;
  turnstileToken?: string;
}

export interface ContactResponse {
  ok: boolean;
  id: string;
}

export interface ContactClientOptions {
  /** Base URL of the @contactkit/server instance, e.g. "https://contact.example.com" */
  baseUrl: string;
  /** Optional fetch implementation; defaults to global fetch */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds; defaults to 10000 */
  timeoutMs?: number;
}

function statusToCode(status: number): ContactErrorCode {
  if (status === 400) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'server';
}

export class ContactClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: ContactClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async send(input: ContactInput): Promise<ContactResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
      if (isAbort) {
        throw new ContactError('Request timed out', 0, 'network');
      }
      throw new NetworkError('Failed to reach the ContactKit server', err);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let code: ContactErrorCode = statusToCode(response.status);
      try {
        const body = (await response.json()) as { code?: ContactErrorCode };
        if (body.code) code = body.code;
      } catch {
        // ignore parse errors
      }
      throw new ContactError(
        `ContactKit server responded with ${response.status}`,
        response.status,
        code,
      );
    }

    return response.json() as Promise<ContactResponse>;
  }
}
