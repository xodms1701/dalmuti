/**
 * PlayerId Value Object
 *
 * Represents a unique identifier for a player.
 * Ensures valid player IDs through validation.
 */
export class PlayerId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('PlayerId cannot be empty');
    }
    this._value = value;
  }

  /**
   * Creates a new PlayerId instance
   * @param value - The string value for the player ID
   * @returns A new PlayerId instance
   * @throws Error if value is empty
   */
  static create(value: string): PlayerId {
    return new PlayerId(value);
  }

  /**
   * Checks equality with another PlayerId
   * @param other - The other PlayerId to compare
   * @returns true if both have the same value
   */
  equals(other: PlayerId): boolean {
    if (!(other instanceof PlayerId)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Returns the string representation of the PlayerId
   * @returns The player ID as a string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Gets the underlying value (for serialization/compatibility)
   * @returns The player ID string value
   */
  get value(): string {
    return this._value;
  }
}
