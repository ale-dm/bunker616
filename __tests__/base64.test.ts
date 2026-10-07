import { encodeBase64 } from '../src/shared/utils/base64';

describe('encodeBase64', () => {
  // Vectores de la RFC 4648 (y "user:pass", el caso real de uso: la cabecera Basic Auth).
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foobar', 'Zm9vYmFy'],
    ['user@example.com:secret', 'dXNlckBleGFtcGxlLmNvbTpzZWNyZXQ='],
  ])('encodes %p as %p', (input, expected) => {
    expect(encodeBase64(input)).toBe(expected);
  });

  it('handles non-ASCII (UTF-8) characters', () => {
    expect(encodeBase64('ñ')).toBe('w7E=');
  });
});
