// Browser stand-in for the one node:crypto call the shared server code uses (offline build only).
class Bytes extends Uint8Array {
  readUInt32LE(o = 0) { return (this[o] | (this[o + 1] << 8) | (this[o + 2] << 16)) + this[o + 3] * 0x1000000; }
  toString(enc?: string) { return enc === 'hex' ? [...this].map((b) => b.toString(16).padStart(2, '0')).join('') : super.toString(); }
}
export function randomBytes(n: number) { const b = new Bytes(n); crypto.getRandomValues(b); return b; }
