// Minimal UTF-8 safe base64 encoder (Hermes has no btoa/Buffer by default).
const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.codePointAt(i)!;
    if (code > 0xffff) {
      i++; // consume surrogate pair
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

export function encodeBase64(input: string): string {
  const bytes = utf8Bytes(input);
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    output += CHARS[b0 >> 2];
    output += CHARS[((b0 & 0x3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    output +=
      b1 === undefined ? '=' : CHARS[((b1 & 0xf) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    output += b2 === undefined ? '=' : CHARS[b2 & 0x3f];
  }
  return output;
}
