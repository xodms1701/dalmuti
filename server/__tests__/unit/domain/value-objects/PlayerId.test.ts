/**
 * PlayerId Value Object Unit Tests
 */

import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';

describe('PlayerId', () => {
  describe('create', () => {
    it('should create PlayerId with valid value', () => {
      // Arrange & Act
      const playerId = PlayerId.create('player123');

      // Assert
      expect(playerId.value).toBe('player123');
      expect(playerId.toString()).toBe('player123');
    });

    it('should create PlayerId with alphanumeric value', () => {
      // Arrange & Act
      const playerId = PlayerId.create('player-123-abc');

      // Assert
      expect(playerId.value).toBe('player-123-abc');
    });

    it('should throw error when value is empty string', () => {
      // Arrange & Act & Assert
      expect(() => PlayerId.create('')).toThrow('PlayerId cannot be empty');
    });

    it('should throw error when value is only whitespace', () => {
      // Arrange & Act & Assert
      expect(() => PlayerId.create('   ')).toThrow('PlayerId cannot be empty');
    });

    it('should throw error when value is null', () => {
      // Arrange & Act & Assert
      expect(() => PlayerId.create(null as unknown as string)).toThrow('PlayerId cannot be empty');
    });

    it('should throw error when value is undefined', () => {
      // Arrange & Act & Assert
      expect(() => PlayerId.create(undefined as unknown as string)).toThrow(
        'PlayerId cannot be empty'
      );
    });

    it('should accept value with special characters', () => {
      // Arrange & Act
      const playerId = PlayerId.create('player_123@test');

      // Assert
      expect(playerId.value).toBe('player_123@test');
    });
  });

  describe('equals', () => {
    it('should return true for PlayerId with same value', () => {
      // Arrange
      const playerId1 = PlayerId.create('player123');
      const playerId2 = PlayerId.create('player123');

      // Act
      const result = playerId1.equals(playerId2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for PlayerId with different value', () => {
      // Arrange
      const playerId1 = PlayerId.create('player123');
      const playerId2 = PlayerId.create('player456');

      // Act
      const result = playerId1.equals(playerId2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing with non-PlayerId object', () => {
      // Arrange
      const playerId = PlayerId.create('player123');
      const notPlayerId = { value: 'player123' };

      // Act
      const result = playerId.equals(notPlayerId as unknown as PlayerId);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      // Arrange
      const playerId1 = PlayerId.create('player123');
      const playerId2 = PlayerId.create('PLAYER123');

      // Act
      const result = playerId1.equals(playerId2);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      // Arrange
      const playerId = PlayerId.create('player123');

      // Act
      const result = playerId.toString();

      // Assert
      expect(result).toBe('player123');
    });

    it('should preserve original value in toString', () => {
      // Arrange
      const value = 'player_test_123';
      const playerId = PlayerId.create(value);

      // Act
      const result = playerId.toString();

      // Assert
      expect(result).toBe(value);
    });
  });

  describe('value getter', () => {
    it('should return the underlying value', () => {
      // Arrange
      const playerId = PlayerId.create('player123');

      // Act
      const result = playerId.value;

      // Assert
      expect(result).toBe('player123');
    });
  });

  describe('immutability', () => {
    it('should maintain value integrity', () => {
      // Arrange
      const playerId = PlayerId.create('player123');

      // Act
      const value1 = playerId.value;
      const value2 = playerId.toString();

      // Assert
      expect(value1).toBe('player123');
      expect(value2).toBe('player123');
      expect(value1).toBe(value2);
    });
  });
});
