export type ContactErrorCode =
  | 'validation'
  | 'rate_limited'
  | 'captcha_failed'
  | 'network'
  | 'server';

export class ContactError extends Error {
  readonly status: number;
  readonly code: ContactErrorCode;

  constructor(message: string, status: number, code: ContactErrorCode) {
    super(message);
    this.name = 'ContactError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  readonly code = 'network' as const;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}
