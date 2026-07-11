/** Ambiguous-safe alphabet — no I/O/0/1 (easy to confuse when reading aloud). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ROOM_CODE_CHAR = new Set(ROOM_CODE_ALPHABET.split(''));
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{6}$`);

export function generateRoomCode(length = 6): string {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** True when `raw` is exactly 6 chars from the same alphabet `generateRoomCode` uses. */
export function isValidRoomCode(raw: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(raw));
}

/** True when a single character is allowed in a room code (after uppercasing). */
export function isRoomCodeChar(raw: string): boolean {
  if (raw.length !== 1) return false;
  return ROOM_CODE_CHAR.has(raw.toUpperCase());
}
