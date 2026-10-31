export class IncompleteError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'IncompleteError';
    Object.setPrototypeOf(this, IncompleteError.prototype);
  }
}
