import { describe, test, expect } from "@jest/globals";
import BrantaClientOptions from "../../src/classes/brantaClientOptions";
import BrantaServerBaseUrl from "../../src/classes/brantaServerBaseUrl";

describe("BrantaClientOptions", () => {
  test("should create instance with minimal required values", () => {
    const config: BrantaClientOptions = { privacy: 'loose' };

    expect(config.baseUrl).toBeUndefined();
    expect(config.defaultApiKey).toBeUndefined();
    expect(config.hmacSecret).toBeUndefined();
    expect(config.privacy).toBe('loose');
  });

  test("should create instance with provided values", () => {
    const config: BrantaClientOptions = {
      baseUrl: BrantaServerBaseUrl.Localhost,
      defaultApiKey: "test-key",
      hmacSecret: "test-secret",
      privacy: 'strict',
    };

    expect(config.baseUrl).toBe(BrantaServerBaseUrl.Localhost);
    expect(config.defaultApiKey).toBe("test-key");
    expect(config.hmacSecret).toBe("test-secret");
    expect(config.privacy).toBe('strict');
  });
});