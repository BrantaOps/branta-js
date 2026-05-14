import { IAesEncryption } from '../v2/interfaces/iAesEncryption.js';
import { AesEncryption } from './aesEncryption.js';

export class AesEncryptionService implements IAesEncryption {
  encrypt(value: string, secret: string, deterministicNonce = false): Promise<string> {
    return AesEncryption.encrypt(value, secret, deterministicNonce);
  }

  decrypt(encryptedValue: string, secret: string): Promise<string> {
    return AesEncryption.decrypt(encryptedValue, secret);
  }
}
