import GameException from './GameException';

export default class NotYourTurnException extends GameException {
  constructor(playerId: string) {
    super(`Not your turn: ${playerId}`);
    this.name = 'NotYourTurnException';
    Object.setPrototypeOf(this, NotYourTurnException.prototype);
  }
}
