import GameException from './GameException';

export default class PlayerNotFoundException extends GameException {
  constructor(playerId: string) {
    super(`Player not found: ${playerId}`);
    this.name = 'PlayerNotFoundException';
    Object.setPrototypeOf(this, PlayerNotFoundException.prototype);
  }
}
