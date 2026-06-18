import type { BrantaCryptoProvider } from '../index.js';

type HashFn = { (data: Uint8Array): Uint8Array } & object;

export interface NobleDeps {
  sha256: HashFn;
  hmac: (hash: HashFn, key: Uint8Array, msg: Uint8Array) => Uint8Array;
  gcm: (key: Uint8Array, nonce: Uint8Array) => { encrypt(data: Uint8Array): Uint8Array; decrypt(data: Uint8Array): Uint8Array };
  randomBytes: (length: number) => Uint8Array;
}

function toBytes(src: BufferSource): Uint8Array {
  if (src instanceof Uint8Array) return src;
  if (ArrayBuffer.isView(src)) return new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
  return new Uint8Array(src as ArrayBuffer);
}

type NobleKey = { raw: Uint8Array };

export function createNobleCryptoProvider({ sha256, hmac, gcm, randomBytes }: NobleDeps): BrantaCryptoProvider {
  return {
    subtle: {
      digest: async (_alg, data) =>
        sha256(toBytes(data)).buffer as ArrayBuffer,
      importKey: async (_fmt, keyData, _alg, _ext, _usages) =>
        ({ raw: toBytes(keyData as BufferSource) }) as unknown as CryptoKey,
      sign: async (_alg, key, data) =>
        hmac(sha256, (key as unknown as NobleKey).raw, toBytes(data)).buffer as ArrayBuffer,
      encrypt: async (alg, key, data) => {
        const { iv } = alg as AesGcmParams;
        return gcm((key as unknown as NobleKey).raw, toBytes(iv as BufferSource)).encrypt(toBytes(data)).buffer as ArrayBuffer;
      },
      decrypt: async (alg, key, data) => {
        const { iv } = alg as AesGcmParams;
        return gcm((key as unknown as NobleKey).raw, toBytes(iv as BufferSource)).decrypt(toBytes(data)).buffer as ArrayBuffer;
      },
    } as SubtleCrypto,
    getRandomValues: <T extends ArrayBufferView>(arr: T): T => {
      new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).set(randomBytes(arr.byteLength));
      return arr;
    },
    randomUUID: (): ReturnType<Crypto['randomUUID']> => {
      const b = randomBytes(16);
      b[6] = (b[6]! & 0x0f) | 0x40;
      b[8] = (b[8]! & 0x3f) | 0x80;
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` as ReturnType<Crypto['randomUUID']>;
    },
  };
}
