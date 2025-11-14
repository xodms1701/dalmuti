/**
 * RoomId Value Object
 *
 * Represents a unique identifier for a game room.
 * Must be exactly 6 alphanumeric characters.
 */
export class RoomId {
  private readonly _value: string;

  private static readonly ROOM_ID_LENGTH = 6;

  private static readonly ALPHANUMERIC_PATTERN = /^[A-Za-z0-9]+$/;

  private constructor(value: string) {
    if (value.length !== RoomId.ROOM_ID_LENGTH) {
      throw new Error(`RoomId must be exactly ${RoomId.ROOM_ID_LENGTH} characters`);
    }
    if (!RoomId.ALPHANUMERIC_PATTERN.test(value)) {
      throw new Error('RoomId must contain only alphanumeric characters');
    }
    this._value = value;
  }

  /**
   * Generates a new random RoomId
   * @returns A new RoomId with random 6-character alphanumeric value
   */
  static generate(): RoomId {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < RoomId.ROOM_ID_LENGTH; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return new RoomId(result);
  }

  /**
   * Creates a RoomId from an existing string value
   * @param value - The string value to create RoomId from
   * @returns A new RoomId instance
   * @throws Error if value is not exactly 6 alphanumeric characters
   */
  static from(value: string): RoomId {
    return new RoomId(value);
  }

  /**
   * Checks equality with another RoomId
   * @param other - The other RoomId to compare
   * @returns true if both have the same value
   */
  equals(other: RoomId): boolean {
    if (!(other instanceof RoomId)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Returns the string representation of the RoomId
   * @returns The room ID as a string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Gets the underlying value (for serialization/compatibility)
   * @returns The room ID string value
   */
  get value(): string {
    return this._value;
  }
}
