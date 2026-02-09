import { describe, test, expect } from "@jest/globals";
import AesEncryption from "./../../src/helpers/aes";

describe("AesEncryption", () => {
  test("should encrypt and decrypt a bitcoin address", async () => {
    const plaintext = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const secret = "mySecret123";

    const encrypted = await AesEncryption.encrypt(plaintext, secret);
    const decrypted = await AesEncryption.decrypt(encrypted, secret);

    expect(decrypted).toBe(plaintext);
  });

  test("should produce different ciphertext with different secrets", async () => {
    const plaintext = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const secret1 = "secret1";
    const secret2 = "secret2";

    const encrypted1 = await AesEncryption.encrypt(plaintext, secret1);
    const encrypted2 = await AesEncryption.encrypt(plaintext, secret2);

    expect(encrypted1).not.toBe(encrypted2);
  });

  test("should decrypt text", async () => {
    const encrypted =
      "pQerSFV+fievHP+guYoGJjx1CzFFrYWHAgWrLhn5473Z19M6+WMScLd1hsk808AEF/x+GpZKmNacFBf5BbQ=";
    const secret1 = "1234";

    const decrypted = await AesEncryption.decrypt(encrypted, secret1);

    expect(decrypted).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
  });
});
