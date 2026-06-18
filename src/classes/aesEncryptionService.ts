import type { BrantaCryptoProvider } from '../index.js';
import { IAesEncryption } from '../v2/interfaces/iAesEncryption.js';
import { AesEncryption } from './aesEncryption.js';

export class AesEncryptionService implements IAesEncryption {
  constructor(private readonly crypto?: BrantaCryptoProvider) {}

  encrypt(value: string, secret: string, deterministicNonce = false): Promise<string> {
    return AesEncryption.encrypt(value, secret, deterministicNonce, this.crypto);
  }

  decrypt(encryptedValue: string, secret: string): Promise<string> {
    return AesEncryption.decrypt(encryptedValue, secret, this.crypto);
  }
}
