export enum BrantaPaymentExceptionReason {
  Tampered = 'tampered',
  CryptoUnavailable = 'crypto_unavailable',
}

export class BrantaPaymentException extends Error {
  readonly reason?: BrantaPaymentExceptionReason;

  constructor(message: string, reason?: BrantaPaymentExceptionReason) {
    super(message);
    this.name = 'BrantaPaymentException';
    this.reason = reason;
    Object.setPrototypeOf(this, BrantaPaymentException.prototype);
  }
}
