/**
 * Phase Value Object
 *
 * Represents the current phase of the game.
 * Enforces valid phase transitions and phase values.
 */
export class Phase {
  private readonly _value: PhaseType;

  // Static constants for each phase
  static readonly WAITING = new Phase('waiting');
  static readonly ROLE_SELECTION = new Phase('roleSelection');
  static readonly ROLE_SELECTION_COMPLETE = new Phase('roleSelectionComplete');
  static readonly CARD_SELECTION = new Phase('cardSelection');
  static readonly PLAYING = new Phase('playing');
  static readonly GAME_END = new Phase('gameEnd');

  private static readonly VALID_PHASES: PhaseType[] = [
    'waiting',
    'roleSelection',
    'roleSelectionComplete',
    'cardSelection',
    'playing',
    'gameEnd',
  ];

  // Phase transition rules
  private static readonly PHASE_TRANSITIONS: Map<PhaseType, PhaseType[]> = new Map([
    ['waiting', ['roleSelection']],
    ['roleSelection', ['roleSelectionComplete']],
    ['roleSelectionComplete', ['cardSelection']],
    ['cardSelection', ['playing']],
    ['playing', ['waiting', 'gameEnd']],
    ['gameEnd', ['waiting']],
  ]);

  private constructor(value: PhaseType) {
    if (!Phase.VALID_PHASES.includes(value)) {
      throw new Error(`Invalid phase: ${value}`);
    }
    this._value = value;
  }

  /**
   * Creates a Phase from a string value
   * @param value - The phase string
   * @returns A new Phase instance
   * @throws Error if value is not a valid phase
   */
  static from(value: string): Phase {
    if (!Phase.VALID_PHASES.includes(value as PhaseType)) {
      throw new Error(`Invalid phase: ${value}`);
    }
    return new Phase(value as PhaseType);
  }

  /**
   * Checks if transition to another phase is valid
   * @param nextPhase - The phase to transition to
   * @returns true if transition is allowed
   */
  canTransitionTo(nextPhase: Phase): boolean {
    const allowedTransitions = Phase.PHASE_TRANSITIONS.get(this._value);
    if (!allowedTransitions) {
      return false;
    }
    return allowedTransitions.includes(nextPhase._value);
  }

  /**
   * Checks equality with another Phase
   * @param other - The other Phase to compare
   * @returns true if both have the same phase value
   */
  equals(other: Phase): boolean {
    if (!(other instanceof Phase)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Returns the string representation of the Phase
   * @returns The phase as a string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Gets the underlying value (for serialization/compatibility)
   * @returns The phase string value
   */
  get value(): PhaseType {
    return this._value;
  }
}

/**
 * Valid phase types for the game
 */
export type PhaseType =
  | 'waiting'
  | 'roleSelection'
  | 'roleSelectionComplete'
  | 'cardSelection'
  | 'playing'
  | 'gameEnd';
