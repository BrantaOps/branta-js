class AesEncryption {
  /**
   * Encrypts a string value using AES-GCM with a secret key
   * @param value - The plaintext to encrypt
   * @param secret - The secret key (will be hashed with SHA-256)
   * @returns Base64-encoded encrypted data (iv + ciphertext + tag)
   */
  static async encrypt(value: string, secret: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const secretData = encoder.encode(secret);
      const keyData = await crypto.subtle.digest('SHA-256', secretData);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const plaintext = encoder.encode(value);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        plaintext
      );

      const encryptedArray = new Uint8Array(encrypted);
      const ciphertext = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      const result = new Uint8Array(iv.length + ciphertext.length + tag.length);
      result.set(iv, 0);
      result.set(ciphertext, iv.length);
      result.set(tag, iv.length + ciphertext.length);

      return btoa(String.fromCharCode(...result));
    } catch (e) {
      throw new Error('Encryption failed: ' + e);
    }
  }

  /**
   * Decrypts an encrypted string using AES-GCM with a secret key
   * @param encryptedValue - Base64-encoded encrypted data
   * @param secret - The secret key (will be hashed with SHA-256)
   * @returns The decrypted plaintext
   */
  static async decrypt(encryptedValue: string, secret: string): Promise<string> {
    try {
      const encryptedData = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));

      if (encryptedData.length < 28) {
        throw new Error('Invalid encrypted data: too short');
      }

      const encoder = new TextEncoder();
      const secretData = encoder.encode(secret);
      const keyData = await crypto.subtle.digest('SHA-256', secretData);

      const iv = encryptedData.slice(0, 12);
      const tag = encryptedData.slice(-16);
      const ciphertext = encryptedData.slice(12, -16);

      const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
      ciphertextWithTag.set(ciphertext, 0);
      ciphertextWithTag.set(tag, ciphertext.length);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        ciphertextWithTag
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (e) {
      throw new Error('Decryption failed: ' + e);
    }
  }
}

export default AesEncryption;
