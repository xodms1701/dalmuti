/**
 * CardRank Value Object
 *
 * Represents the rank of a card (1-13).
 * Lower rank number = stronger card (1 is the strongest, 13 is the weakest).
 */
export class CardRank {
  private readonly _value: number;

  private static readonly MIN_RANK = 1;

  private static readonly MAX_RANK = 13;

  private constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error('CardRank must be an integer');
    }
    if (value < CardRank.MIN_RANK || value > CardRank.MAX_RANK) {
      throw new Error(`CardRank must be between ${CardRank.MIN_RANK} and ${CardRank.MAX_RANK}`);
    }
    this._value = value;
  }

  /**
   * Creates a new CardRank instance
   * @param value - The numeric rank value (1-13)
   * @returns A new CardRank instance
   * @throws Error if value is not between 1 and 13
   */
  static create(value: number): CardRank {
    return new CardRank(value);
  }

  /**
   * Compares this CardRank with another
   * @param other - The other CardRank to compare
   * @returns negative if this is stronger (lower rank), positive if weaker (higher rank), 0 if equal
   */
  compareTo(other: CardRank): number {
    return this._value - other._value;
  }

  /**
   * Checks if this card rank is stronger than another
   * Lower rank number = stronger card
   * @param other - The other CardRank to compare
   * @returns true if this card is stronger (has lower rank number)
   */
  isStrongerThan(other: CardRank): boolean {
    return this._value < other._value;
  }

  /**
   * Checks equality with another CardRank
   * @param other - The other CardRank to compare
   * @returns true if both have the same rank value
   */
  equals(other: CardRank): boolean {
    if (!(other instanceof CardRank)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Returns the numeric rank value
   * @returns The rank as a number (1-13)
   */
  toNumber(): number {
    return this._value;
  }

  /**
   * Gets the underlying value (for serialization/compatibility)
   * @returns The rank number value
   */
  get value(): number {
    return this._value;
  }
}
