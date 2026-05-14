import { ISecretGenerator } from '../interfaces/iSecretGenerator.js';

export class GuidSecretGenerator implements ISecretGenerator {
  readonly deterministicNonce = false;

  generate(): string {
    return crypto.randomUUID();
  }
}
