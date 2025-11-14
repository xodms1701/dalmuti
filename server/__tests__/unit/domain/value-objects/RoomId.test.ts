/**
 * RoomId Value Object Unit Tests
 */

import { RoomId } from '../../../../src/domain/value-objects/RoomId';

describe('RoomId', () => {
  describe('generate', () => {
    it('should generate a RoomId with 6 characters', () => {
      // Arrange & Act
      const roomId = RoomId.generate();

      // Assert
      expect(roomId.value).toHaveLength(6);
    });

    it('should generate alphanumeric characters only', () => {
      // Arrange & Act
      const roomId = RoomId.generate();

      // Assert
      expect(roomId.value).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate different values on multiple calls', () => {
      // Arrange & Act
      const roomId1 = RoomId.generate();
      const roomId2 = RoomId.generate();
      const roomId3 = RoomId.generate();

      // Assert
      // At least one should be different (statistically very likely)
      const allSame =
        roomId1.value === roomId2.value && roomId2.value === roomId3.value;
      expect(allSame).toBe(false);
    });

    it('should generate uppercase letters and digits', () => {
      // Arrange
      const generatedValues = new Set<string>();

      // Act - generate multiple times to check character set
      for (let i = 0; i < 100; i++) {
        const roomId = RoomId.generate();
        generatedValues.add(roomId.value);
        expect(roomId.value).toMatch(/^[A-Z0-9]{6}$/);
      }

      // Assert - should have variety (not all same)
      expect(generatedValues.size).toBeGreaterThan(1);
    });
  });

  describe('from', () => {
    it('should create RoomId from valid 6-character alphanumeric string', () => {
      // Arrange & Act
      const roomId = RoomId.from('ROOM01');

      // Assert
      expect(roomId.value).toBe('ROOM01');
    });

    it('should accept uppercase letters', () => {
      // Arrange & Act
      const roomId = RoomId.from('ABCDEF');

      // Assert
      expect(roomId.value).toBe('ABCDEF');
    });

    it('should accept lowercase letters', () => {
      // Arrange & Act
      const roomId = RoomId.from('abcdef');

      // Assert
      expect(roomId.value).toBe('abcdef');
    });

    it('should accept mixed case', () => {
      // Arrange & Act
      const roomId = RoomId.from('AbC123');

      // Assert
      expect(roomId.value).toBe('AbC123');
    });

    it('should accept all digits', () => {
      // Arrange & Act
      const roomId = RoomId.from('123456');

      // Assert
      expect(roomId.value).toBe('123456');
    });

    it('should throw error when length is less than 6', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABC12')).toThrow('RoomId must be exactly 6 characters');
    });

    it('should throw error when length is greater than 6', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABCDEFG')).toThrow('RoomId must be exactly 6 characters');
    });

    it('should throw error when empty string', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('')).toThrow('RoomId must be exactly 6 characters');
    });

    it('should throw error when contains non-alphanumeric characters', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABC-12')).toThrow(
        'RoomId must contain only alphanumeric characters'
      );
    });

    it('should throw error when contains spaces', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABC 12')).toThrow(
        'RoomId must contain only alphanumeric characters'
      );
    });

    it('should throw error when contains special characters', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABC@12')).toThrow(
        'RoomId must contain only alphanumeric characters'
      );
    });

    it('should throw error when contains underscore', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('ABC_12')).toThrow(
        'RoomId must contain only alphanumeric characters'
      );
    });
  });

  describe('equals', () => {
    it('should return true for RoomId with same value', () => {
      // Arrange
      const roomId1 = RoomId.from('ROOM01');
      const roomId2 = RoomId.from('ROOM01');

      // Act
      const result = roomId1.equals(roomId2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for RoomId with different value', () => {
      // Arrange
      const roomId1 = RoomId.from('ROOM01');
      const roomId2 = RoomId.from('ROOM02');

      // Act
      const result = roomId1.equals(roomId2);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      // Arrange
      const roomId1 = RoomId.from('ROOM01');
      const roomId2 = RoomId.from('room01');

      // Act
      const result = roomId1.equals(roomId2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing with non-RoomId object', () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const notRoomId = { value: 'ROOM01' };

      // Act
      const result = roomId.equals(notRoomId as unknown as RoomId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');

      // Act
      const result = roomId.toString();

      // Assert
      expect(result).toBe('ROOM01');
    });

    it('should preserve case in toString', () => {
      // Arrange
      const roomId = RoomId.from('AbC123');

      // Act
      const result = roomId.toString();

      // Assert
      expect(result).toBe('AbC123');
    });
  });

  describe('value getter', () => {
    it('should return the underlying value', () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');

      // Act
      const result = roomId.value;

      // Assert
      expect(result).toBe('ROOM01');
    });
  });

  describe('immutability', () => {
    it('should maintain value integrity', () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');

      // Act
      const value1 = roomId.value;
      const value2 = roomId.toString();

      // Assert
      expect(value1).toBe('ROOM01');
      expect(value2).toBe('ROOM01');
      expect(value1).toBe(value2);
    });
  });
});
