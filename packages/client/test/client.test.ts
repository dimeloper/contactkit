import { describe, it, expect, vi } from 'vitest';
import { ContactClient, ContactError, NetworkError } from '../src/index.js';

const makeInput = () => ({
  name: 'Alice',
  email: 'alice@example.com',
  message: 'Hello from the SDK test',
});

describe('ContactClient', () => {
  it('calls /contact with the correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, id: 'abc-123' }),
    } as unknown as Response);

    const client = new ContactClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch });
    const result = await client.send(makeInput());

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/contact');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject(makeInput());
    expect(result.ok).toBe(true);
    expect(result.id).toBe('abc-123');
  });

  it('strips trailing slash from baseUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, id: 'x' }),
    } as unknown as Response);
    const client = new ContactClient({
      baseUrl: 'http://localhost:3000/',
      fetch: mockFetch,
    });
    await client.send(makeInput());
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3000/contact');
  });

  it('includes optional subject in payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, id: 'y' }),
    } as unknown as Response);

    const client = new ContactClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch });
    await client.send({ ...makeInput(), subject: 'My inquiry' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ subject: 'My inquiry' });
  });

  it('throws ContactError with code "validation" on 400', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    } as unknown as Response);

    const client = new ContactClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch });

    const err = await client.send(makeInput()).catch((e) => e);
    expect(err).toBeInstanceOf(ContactError);
    expect((err as ContactError).status).toBe(400);
    expect((err as ContactError).code).toBe('validation');
  });

  it('throws ContactError with code "rate_limited" on 429', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Too Many Requests' }),
    } as unknown as Response);

    const client = new ContactClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch });

    const err = await client.send(makeInput()).catch((e) => e);
    expect(err).toBeInstanceOf(ContactError);
    expect((err as ContactError).code).toBe('rate_limited');
  });

  it('throws NetworkError when fetch rejects', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new ContactClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch });

    await expect(client.send(makeInput())).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws ContactError on timeout (AbortError)', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });

    const client = new ContactClient({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch,
      timeoutMs: 1,
    });

    const err = await client.send(makeInput()).catch((e) => e);
    expect(err).toBeInstanceOf(ContactError);
    expect((err as ContactError).code).toBe('network');
  });
});
