type Bytes = Uint8Array<ArrayBuffer>;

const subtle = (): SubtleCrypto => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto API is not available. See README for React Native polyfill instructions.');
  }
  return c.subtle;
};

const getRandomBytes = (length: number): Bytes => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues) {
    throw new Error('Web Crypto API is not available. See README for React Native polyfill instructions.');
  }
  return c.getRandomValues(new Uint8Array(length));
};

const utf8Bytes = (text: string): Bytes => new TextEncoder().encode(text);

const utf8String = (bytes: Bytes): string => new TextDecoder().decode(bytes);

const toBase64 = (bytes: Bytes): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Bytes => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const sha256 = async (bytes: Bytes): Promise<Bytes> => {
  const hash = await subtle().digest('SHA-256', bytes);
  return new Uint8Array(hash);
};

const hmacSha256 = async (keyBytes: Bytes, messageBytes: Bytes): Promise<Bytes> => {
  const key = await subtle().importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await subtle().sign('HMAC', key, messageBytes);
  return new Uint8Array(signature);
};

export class AesEncryption {
  static async encrypt(value: string, secret: string, deterministicNonce = false): Promise<string> {
    try {
      const keyData = await sha256(utf8Bytes(secret));

      let iv: Bytes;
      if (!deterministicNonce) {
        iv = getRandomBytes(12);
      } else {
        const derived = await hmacSha256(keyData, utf8Bytes(value));
        iv = derived.slice(0, 12) as Bytes;
      }

      const key = await subtle().importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
      const encrypted = new Uint8Array(
        await subtle().encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, utf8Bytes(value)),
      );

      const result = new Uint8Array(iv.length + encrypted.length);
      result.set(iv, 0);
      result.set(encrypted, iv.length);

      return toBase64(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error('Encryption failed: ' + message);
    }
  }

  static async decrypt(encryptedValue: string, secret: string): Promise<string> {
    let encryptedData: Bytes;
    try {
      encryptedData = fromBase64(encryptedValue);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error('Decryption failed: ' + message);
    }

    if (encryptedData.length < 28) {
      throw new Error('Invalid encrypted data: too short');
    }

    try {
      const keyData = await sha256(utf8Bytes(secret));
      const iv = encryptedData.slice(0, 12) as Bytes;
      const ciphertextAndTag = encryptedData.slice(12) as Bytes;

      const key = await subtle().importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);
      const plaintext = new Uint8Array(
        await subtle().decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ciphertextAndTag),
      );

      return utf8String(plaintext);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error('Decryption failed: ' + message);
    }
  }
}
