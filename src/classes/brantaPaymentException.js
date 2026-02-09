class BrantaPaymentException extends Error {
  constructor(message) {
    super(message);
    this.name = "BrantaPaymentException";
  }
}

export default BrantaPaymentException
