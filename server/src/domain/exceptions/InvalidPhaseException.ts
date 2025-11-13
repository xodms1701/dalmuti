import GameException from './GameException';

export default class InvalidPhaseException extends GameException {
  constructor(currentPhase: string, expectedPhase: string) {
    super(`Invalid phase: ${currentPhase}. Expected: ${expectedPhase}`);
    this.name = 'InvalidPhaseException';
    Object.setPrototypeOf(this, InvalidPhaseException.prototype);
  }
}
