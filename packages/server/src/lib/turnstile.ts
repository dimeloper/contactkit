export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes?: string[];
}

/**
 * Verifies a Cloudflare Turnstile token.
 * Returns `{ success: true }` when TURNSTILE_SECRET is not set (opt-out of bot protection).
 */
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
): Promise<TurnstileVerifyResult> {
  if (!secret) {
    return { success: true };
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

  return {
    success: data.success,
    errorCodes: data['error-codes'],
  };
}
