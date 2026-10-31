export enum BrantaPaymentExceptionReason {
  CryptoUnavailable = 'crypto_unavailable',
  CouldNotCheck = 'could_not_check',
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
