export default class GameException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameException';
    Object.setPrototypeOf(this, GameException.prototype);
  }
}
