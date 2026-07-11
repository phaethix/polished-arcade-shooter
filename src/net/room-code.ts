const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

export function generateRoomCode(length = 6): string {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidRoomCode(raw: string): boolean {
  const code = normalizeRoomCode(raw);
  return /^[A-Z0-9]{6}$/.test(code);
}
