/**
 * Password hashing via PBKDF2-HMAC-SHA256, using the Web Crypto API
 * (crypto.subtle) - natively available in Cloudflare Workers, Node.js, and
 * browsers, with zero WASM involved.
 *
 * Replaces Argon2id (tried via hash-wasm, then @rabbit-company/argon2id).
 * Both turned out to be fundamentally incompatible with Cloudflare Workers:
 * Workers disallows dynamic WebAssembly compilation at request time
 * ("Wasm code generation disallowed by embedder" - confirmed live, this was
 * the actual cause of a production 500 on POST /auth/login), and both
 * libraries compile their WASM binary from fetched bytes at runtime rather
 * than via a genuine build-time module import. This is a hard platform
 * restriction, not something a wrangler.toml setting or a different Argon2
 * package variant can route around.
 *
 * PBKDF2-HMAC-SHA256 is OWASP's accepted alternative when Argon2id isn't
 * available - but at OWASP's current recommended strength (600,000
 * iterations), it costs ~780ms of real CPU time (measured via this exact
 * Node-native crypto.subtle call) - that cost is inherent to the algorithm's
 * security design (deliberately expensive to resist brute force), not
 * implementation overhead, and it would need the Workers Paid plan's much
 * larger CPU budget (30s default, vs the Free plan's hard 10ms/request cap)
 * to run at that strength.
 *
 * SECURITY-TODO: owner chose to stay on the Workers Free plan and lower
 * iterations to fit its 10ms budget instead of upgrading - ITERATIONS below
 * is far under OWASP's 600,000 recommendation (a real, deliberate security
 * reduction, not a routine tuning tweak). Revisit before real production
 * traffic - raising ITERATIONS back toward 600,000 only requires the Paid
 * plan upgrade, no code change.
 */
const ITERATIONS = 3000;
const SALT_LENGTH_BYTES = 16;
const HASH_LENGTH_BITS = 256;
const ALGORITHM_ID = 'pbkdf2-sha256';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations },
    keyMaterial,
    HASH_LENGTH_BITS,
  );
  return new Uint8Array(derived);
}

/**
 * Encoded as `<algorithm>$<iterations>$<base64 salt>$<base64 hash>` - the
 * iteration count travels with the hash (like Argon2/bcrypt's PHC format) so
 * verifyPassword always re-derives with the exact parameters a given hash
 * was created with, even across a future ITERATIONS change.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(salt);
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `${ALGORITHM_ID}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split('$');
  const [algorithmId, iterationsStr, saltB64, hashB64] = parts;
  if (parts.length !== 4 || algorithmId !== ALGORITHM_ID || !iterationsStr || !saltB64 || !hashB64) {
    return false;
  }

  const iterations = parseInt(iterationsStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(hashB64);
  const actual = await deriveBits(password, salt, iterations);

  if (actual.length !== expected.length) {
    return false;
  }
  // Constant-time comparison - don't leak match progress via early-exit timing.
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  }
  return diff === 0;
}
