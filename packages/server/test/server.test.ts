import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';
import { parseEnv } from '../src/env.js';

const baseEnv = {
  NODE_ENV: 'test',
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 'test-key',
  MAIL_TO: 'admin@example.com',
  MAIL_FROM: 'noreply@example.com',
};

const mockSend = vi.fn().mockResolvedValue({ id: 'mock-id-123' });

vi.mock('../src/mailer/resend.js', () => ({
  ResendMailer: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}));

describe('parseEnv — validation', () => {
  it('throws when MAIL_TO is missing', () => {
    expect(() =>
      parseEnv({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'key',
        MAIL_FROM: 'noreply@example.com',
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it('throws when EMAIL_PROVIDER=resend and RESEND_API_KEY is missing', () => {
    expect(() =>
      parseEnv({
        EMAIL_PROVIDER: 'resend',
        MAIL_TO: 'admin@example.com',
        MAIL_FROM: 'noreply@example.com',
      } as NodeJS.ProcessEnv),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('throws when EMAIL_PROVIDER=smtp and SMTP_HOST is missing', () => {
    expect(() =>
      parseEnv({
        EMAIL_PROVIDER: 'smtp',
        SMTP_PORT: '587',
        MAIL_TO: 'admin@example.com',
        MAIL_FROM: 'noreply@example.com',
      } as NodeJS.ProcessEnv),
    ).toThrow(/SMTP_HOST/);
  });

  it('throws when EMAIL_PROVIDER=smtp and SMTP_PORT is missing', () => {
    expect(() =>
      parseEnv({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        MAIL_TO: 'admin@example.com',
        MAIL_FROM: 'noreply@example.com',
      } as NodeJS.ProcessEnv),
    ).toThrow(/SMTP_PORT/);
  });

  it('succeeds with valid resend config', () => {
    const env = parseEnv(baseEnv as NodeJS.ProcessEnv);
    expect(env.EMAIL_PROVIDER).toBe('resend');
    expect(env.MAIL_TO).toBe('admin@example.com');
  });
});

describe('GET /', () => {
  it('returns name and version', async () => {
    const { app } = await buildApp(baseEnv as NodeJS.ProcessEnv);
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ name: string; version: string }>();
    expect(body.name).toBeTruthy();
    expect(body.version).toBeTruthy();
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok and uptime', async () => {
    const { app } = await buildApp(baseEnv as NodeJS.ProcessEnv);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ status: string; uptime: number }>();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });
});

describe('POST /contact', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];

  beforeEach(async () => {
    mockSend.mockClear();
    ({ app } = await buildApp(baseEnv as NodeJS.ProcessEnv));
  });

  it('returns 200 with ok and id for valid payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'Alice',
        email: 'alice@example.com',
        message: 'Hello there!',
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ ok: boolean; id: string }>();
    expect(body.ok).toBe(true);
    expect(typeof body.id).toBe('string');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('passes subject and replyTo to mailer', async () => {
    await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'My inquiry',
        message: 'Hello!',
      },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'alice@example.com',
        subject: expect.stringContaining('My inquiry'),
      }),
    );
  });

  it('returns 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: { name: 'Bob' },
    });
    expect(response.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'Carol',
        email: 'not-an-email',
        message: 'Test message',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('honeypot: returns 200 silently without calling mailer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: {
        name: 'Bot',
        email: 'bot@example.com',
        message: 'Spam message',
        website: 'http://spam.example.com',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ ok: boolean }>().ok).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const rateLimitApp = (
      await buildApp({
        ...baseEnv,
        RATE_LIMIT_MAX: '1',
        RATE_LIMIT_WINDOW: '60000',
      } as NodeJS.ProcessEnv)
    ).app;

    const payload = { name: 'Alice', email: 'alice@example.com', message: 'Hello' };

    // First request should succeed
    const first = await rateLimitApp.inject({ method: 'POST', url: '/contact', payload });
    expect(first.statusCode).toBe(200);

    // Second request from the same IP should be rate limited
    const second = await rateLimitApp.inject({ method: 'POST', url: '/contact', payload });
    expect(second.statusCode).toBe(429);
  });
});
