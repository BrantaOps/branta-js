export interface ISecretGenerator {
  generate(): string;
  readonly deterministicNonce: boolean;
}
