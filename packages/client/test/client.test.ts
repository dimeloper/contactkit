import { describe, it, expect, vi } from 'vitest';
import { ContactKitClient, ContactKitError, NetworkError } from '../src/index.js';

const makePayload = () => ({
  name: 'Alice',
  email: 'alice@example.com',
  message: 'Hello from the SDK test',
});

describe('ContactKitClient', () => {
  it('calls /contact with the correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as unknown as Response);

    const client = new ContactKitClient({ baseUrl: 'http://localhost:3000', fetchFn: mockFetch });
    await client.submit(makePayload());

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/contact');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject(makePayload());
  });

  it('strips trailing slash from baseUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    const client = new ContactKitClient({
      baseUrl: 'http://localhost:3000/',
      fetchFn: mockFetch,
    });
    await client.submit(makePayload());
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3000/contact');
  });

  it('throws ContactKitError on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    } as unknown as Response);

    const client = new ContactKitClient({ baseUrl: 'http://localhost:3000', fetchFn: mockFetch });

    await expect(client.submit(makePayload())).rejects.toBeInstanceOf(ContactKitError);
  });

  it('throws NetworkError when fetch rejects', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new ContactKitClient({ baseUrl: 'http://localhost:3000', fetchFn: mockFetch });

    await expect(client.submit(makePayload())).rejects.toBeInstanceOf(NetworkError);
  });
});
