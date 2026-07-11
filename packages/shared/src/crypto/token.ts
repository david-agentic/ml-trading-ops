/**
 * For hashing refresh tokens and password-reset tokens before storage — these are
 * already high-entropy random values (unlike user passwords), so a fast hash is the
 * right tool; Argon2id's deliberate slowness would be pointless cost here.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Random opaque token for password-reset links (not a JWT — no payload to verify). */
export function generateOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
