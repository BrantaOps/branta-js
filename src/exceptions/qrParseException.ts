export class QRParseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRParseException';
    Object.setPrototypeOf(this, QRParseException.prototype);
  }
}
