export class BrantaPaymentException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrantaPaymentException';
    Object.setPrototypeOf(this, BrantaPaymentException.prototype);
  }
}
