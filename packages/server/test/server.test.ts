import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';

const baseEnv = {
  NODE_ENV: 'test',
  MAILER: 'resend',
  RESEND_API_KEY: 'test-key',
  TO_EMAIL: 'admin@example.com',
  FROM_EMAIL: 'noreply@example.com',
};

vi.mock('../src/mailer/resend.js', () => ({
  ResendMailer: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const { app } = await buildApp(baseEnv as NodeJS.ProcessEnv);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });
});

describe('POST /contact', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];

  beforeEach(async () => {
    ({ app } = await buildApp(baseEnv as NodeJS.ProcessEnv));
  });

  it('returns 200 for valid payload', async () => {
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
    expect(response.json<{ ok: boolean }>().ok).toBe(true);
  });

  it('returns 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/contact',
      payload: { name: 'Bob' },
    });
    expect(response.statusCode).toBe(400);
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
  });
});
