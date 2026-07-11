const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'; // no I/l/O/0 ambiguity
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;

function randomIndex(max: number): number {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  // bytes has length 1, so bytes[0] is always present — safe under noUncheckedIndexedAccess.
  return (bytes[0] as number) % max;
}

function randomChar(charset: string): string {
  // charset args below are always non-empty constants, so this index is always in bounds.
  return charset[randomIndex(charset.length)] as string;
}

/** Guarantees at least one letter and one digit, satisfying @ml-trading-ops/shared's passwordSchema. */
export function generateTempPassword(length = 20): string {
  const chars = [randomChar(LETTERS), randomChar(DIGITS)];
  for (let i = chars.length; i < length; i++) {
    chars.push(randomChar(ALL));
  }
  // Fisher-Yates shuffle so the guaranteed letter/digit aren't always in positions 0/1.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const temp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = temp;
  }
  return chars.join('');
}
