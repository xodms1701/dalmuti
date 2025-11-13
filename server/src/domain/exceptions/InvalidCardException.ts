import GameException from './GameException';

export default class InvalidCardException extends GameException {
  constructor(reason: string) {
    super(`Invalid card: ${reason}`);
    this.name = 'InvalidCardException';
    Object.setPrototypeOf(this, InvalidCardException.prototype);
  }
}
