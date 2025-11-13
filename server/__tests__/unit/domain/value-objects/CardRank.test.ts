/**
 * CardRank Value Object Unit Tests
 */

import { CardRank } from '../../../../src/domain/value-objects/CardRank';

describe('CardRank', () => {
  describe('create', () => {
    it('should create CardRank with valid rank', () => {
      // Arrange & Act
      const cardRank = CardRank.create(5);

      // Assert
      expect(cardRank.value).toBe(5);
      expect(cardRank.toNumber()).toBe(5);
    });

    it('should create CardRank with rank 1 (strongest)', () => {
      // Arrange & Act
      const cardRank = CardRank.create(1);

      // Assert
      expect(cardRank.value).toBe(1);
    });

    it('should create CardRank with rank 13 (weakest)', () => {
      // Arrange & Act
      const cardRank = CardRank.create(13);

      // Assert
      expect(cardRank.value).toBe(13);
    });

    it('should throw error when rank is 0', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(0)).toThrow('CardRank must be between 1 and 13');
    });

    it('should throw error when rank is less than 1', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(-1)).toThrow('CardRank must be between 1 and 13');
    });

    it('should throw error when rank is greater than 13', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(14)).toThrow('CardRank must be between 1 and 13');
    });

    it('should throw error when rank is not an integer', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(5.5)).toThrow('CardRank must be an integer');
    });

    it('should throw error when rank is NaN', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(NaN)).toThrow('CardRank must be an integer');
    });

    it('should throw error when rank is Infinity', () => {
      // Arrange & Act & Assert
      expect(() => CardRank.create(Infinity)).toThrow('CardRank must be an integer');
    });
  });

  describe('compareTo', () => {
    it('should return negative when this rank is stronger (lower)', () => {
      // Arrange
      const rank1 = CardRank.create(1);
      const rank2 = CardRank.create(5);

      // Act
      const result = rank1.compareTo(rank2);

      // Assert
      expect(result).toBeLessThan(0);
    });

    it('should return positive when this rank is weaker (higher)', () => {
      // Arrange
      const rank1 = CardRank.create(10);
      const rank2 = CardRank.create(5);

      // Act
      const result = rank1.compareTo(rank2);

      // Assert
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when ranks are equal', () => {
      // Arrange
      const rank1 = CardRank.create(7);
      const rank2 = CardRank.create(7);

      // Act
      const result = rank1.compareTo(rank2);

      // Assert
      expect(result).toBe(0);
    });

    it('should return -12 when comparing rank 1 to rank 13', () => {
      // Arrange
      const strongest = CardRank.create(1);
      const weakest = CardRank.create(13);

      // Act
      const result = strongest.compareTo(weakest);

      // Assert
      expect(result).toBe(-12);
    });

    it('should return 12 when comparing rank 13 to rank 1', () => {
      // Arrange
      const weakest = CardRank.create(13);
      const strongest = CardRank.create(1);

      // Act
      const result = weakest.compareTo(strongest);

      // Assert
      expect(result).toBe(12);
    });
  });

  describe('isStrongerThan', () => {
    it('should return true when this rank is lower (stronger)', () => {
      // Arrange
      const rank1 = CardRank.create(1);
      const rank2 = CardRank.create(5);

      // Act
      const result = rank1.isStrongerThan(rank2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when this rank is higher (weaker)', () => {
      // Arrange
      const rank1 = CardRank.create(10);
      const rank2 = CardRank.create(5);

      // Act
      const result = rank1.isStrongerThan(rank2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when ranks are equal', () => {
      // Arrange
      const rank1 = CardRank.create(7);
      const rank2 = CardRank.create(7);

      // Act
      const result = rank1.isStrongerThan(rank2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for rank 1 vs rank 13', () => {
      // Arrange
      const strongest = CardRank.create(1);
      const weakest = CardRank.create(13);

      // Act
      const result = strongest.isStrongerThan(weakest);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for rank 13 vs rank 1', () => {
      // Arrange
      const weakest = CardRank.create(13);
      const strongest = CardRank.create(1);

      // Act
      const result = weakest.isStrongerThan(strongest);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for rank 2 vs rank 3', () => {
      // Arrange
      const rank2 = CardRank.create(2);
      const rank3 = CardRank.create(3);

      // Act
      const result = rank2.isStrongerThan(rank3);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for CardRank with same value', () => {
      // Arrange
      const rank1 = CardRank.create(5);
      const rank2 = CardRank.create(5);

      // Act
      const result = rank1.equals(rank2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for CardRank with different value', () => {
      // Arrange
      const rank1 = CardRank.create(5);
      const rank2 = CardRank.create(7);

      // Act
      const result = rank1.equals(rank2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing with non-CardRank object', () => {
      // Arrange
      const rank = CardRank.create(5);
      const notRank = { value: 5 };

      // Act
      const result = rank.equals(notRank as any);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for rank 1 comparisons', () => {
      // Arrange
      const rank1 = CardRank.create(1);
      const rank2 = CardRank.create(1);

      // Act
      const result = rank1.equals(rank2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for rank 13 comparisons', () => {
      // Arrange
      const rank1 = CardRank.create(13);
      const rank2 = CardRank.create(13);

      // Act
      const result = rank1.equals(rank2);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('toNumber', () => {
    it('should return the numeric value', () => {
      // Arrange
      const rank = CardRank.create(7);

      // Act
      const result = rank.toNumber();

      // Assert
      expect(result).toBe(7);
    });

    it('should return 1 for rank 1', () => {
      // Arrange
      const rank = CardRank.create(1);

      // Act
      const result = rank.toNumber();

      // Assert
      expect(result).toBe(1);
    });

    it('should return 13 for rank 13', () => {
      // Arrange
      const rank = CardRank.create(13);

      // Act
      const result = rank.toNumber();

      // Assert
      expect(result).toBe(13);
    });
  });

  describe('value getter', () => {
    it('should return the underlying value', () => {
      // Arrange
      const rank = CardRank.create(5);

      // Act
      const result = rank.value;

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle all valid ranks (1-13)', () => {
      // Arrange & Act & Assert
      for (let i = 1; i <= 13; i++) {
        const rank = CardRank.create(i);
        expect(rank.value).toBe(i);
      }
    });

    it('should correctly compare all adjacent ranks', () => {
      // Arrange & Act & Assert
      for (let i = 1; i < 13; i++) {
        const lower = CardRank.create(i);
        const higher = CardRank.create(i + 1);
        expect(lower.isStrongerThan(higher)).toBe(true);
        expect(higher.isStrongerThan(lower)).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    it('should maintain value integrity', () => {
      // Arrange
      const rank = CardRank.create(5);

      // Act
      const value1 = rank.value;
      const value2 = rank.toNumber();

      // Assert
      expect(value1).toBe(5);
      expect(value2).toBe(5);
      expect(value1).toBe(value2);
    });
  });
});
