import type { BrantaCryptoProvider } from './brantaCryptoProvider.js';
import { ISecretGenerator } from '../interfaces/iSecretGenerator.js';

export class GuidSecretGenerator implements ISecretGenerator {
  readonly deterministicNonce = false;

  constructor(private readonly crypto?: Pick<BrantaCryptoProvider, 'randomUUID'>) {}

  generate(): string {
    return (this.crypto ?? globalThis.crypto).randomUUID();
  }
}
