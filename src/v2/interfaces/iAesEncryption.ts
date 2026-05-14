export interface IAesEncryption {
  encrypt(value: string, secret: string, deterministicNonce?: boolean): Promise<string>;
  decrypt(encryptedValue: string, secret: string): Promise<string>;
}
