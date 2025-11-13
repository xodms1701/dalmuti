/**
 * Card Entity Unit Tests
 */

import { Card } from '../../../../src/domain/entities/Card';

describe('Card', () => {
  describe('create', () => {
    it('should create a card with valid rank', () => {
      // Arrange & Act
      const card = Card.create(5);

      // Assert
      expect(card.rank).toBe(5);
      expect(card.isJoker).toBe(false);
    });

    it('should create a joker card', () => {
      // Arrange & Act
      const card = Card.create(13, true);

      // Assert
      expect(card.rank).toBe(13);
      expect(card.isJoker).toBe(true);
    });

    it('should create card with rank 1 (strongest)', () => {
      // Arrange & Act
      const card = Card.create(1);

      // Assert
      expect(card.rank).toBe(1);
    });

    it('should create card with rank 13 (weakest)', () => {
      // Arrange & Act
      const card = Card.create(13);

      // Assert
      expect(card.rank).toBe(13);
    });

    it('should throw error when rank is less than 1', () => {
      // Arrange & Act & Assert
      expect(() => Card.create(0)).toThrow('Card rank must be between 1 and 13');
    });

    it('should throw error when rank is greater than 13', () => {
      // Arrange & Act & Assert
      expect(() => Card.create(14)).toThrow('Card rank must be between 1 and 13');
    });

    it('should throw error when rank is negative', () => {
      // Arrange & Act & Assert
      expect(() => Card.create(-1)).toThrow('Card rank must be between 1 and 13');
    });
  });

  describe('isStrongerThan', () => {
    it('should return true when card has lower rank (stronger)', () => {
      // Arrange
      const card1 = Card.create(1);
      const card2 = Card.create(5);

      // Act
      const result = card1.isStrongerThan(card2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when card has higher rank (weaker)', () => {
      // Arrange
      const card1 = Card.create(10);
      const card2 = Card.create(5);

      // Act
      const result = card1.isStrongerThan(card2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when cards have equal rank', () => {
      // Arrange
      const card1 = Card.create(7);
      const card2 = Card.create(7);

      // Act
      const result = card1.isStrongerThan(card2);

      // Assert
      expect(result).toBe(false);
    });

    it('should treat joker as rank 13 when comparing', () => {
      // Arrange
      const joker = Card.create(13, true);
      const card = Card.create(5);

      // Act
      const result = joker.isStrongerThan(card);

      // Assert
      expect(result).toBe(false); // Joker (13) is weaker than 5
    });

    it('should compare two jokers as equal strength', () => {
      // Arrange
      const joker1 = Card.create(13, true);
      const joker2 = Card.create(13, true);

      // Act
      const result = joker1.isStrongerThan(joker2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for rank 1 vs rank 13', () => {
      // Arrange
      const strongest = Card.create(1);
      const weakest = Card.create(13);

      // Act
      const result = strongest.isStrongerThan(weakest);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for cards with same rank and joker status', () => {
      // Arrange
      const card1 = Card.create(5);
      const card2 = Card.create(5);

      // Act
      const result = card1.equals(card2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for cards with different rank', () => {
      // Arrange
      const card1 = Card.create(5);
      const card2 = Card.create(7);

      // Act
      const result = card1.equals(card2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for normal card vs joker with same rank', () => {
      // Arrange
      const card = Card.create(13);
      const joker = Card.create(13, true);

      // Act
      const result = card.equals(joker);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for two jokers', () => {
      // Arrange
      const joker1 = Card.create(13, true);
      const joker2 = Card.create(13, true);

      // Act
      const result = joker1.equals(joker2);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('toPlainObject', () => {
    it('should convert card to plain object', () => {
      // Arrange
      const card = Card.create(5);

      // Act
      const plain = card.toPlainObject();

      // Assert
      expect(plain).toEqual({ rank: 5, isJoker: false });
    });

    it('should convert joker to plain object', () => {
      // Arrange
      const joker = Card.create(13, true);

      // Act
      const plain = joker.toPlainObject();

      // Assert
      expect(plain).toEqual({ rank: 13, isJoker: true });
    });
  });

  describe('fromPlainObject', () => {
    it('should create card from plain object', () => {
      // Arrange
      const plain = { rank: 7, isJoker: false };

      // Act
      const card = Card.fromPlainObject(plain);

      // Assert
      expect(card.rank).toBe(7);
      expect(card.isJoker).toBe(false);
    });

    it('should create joker from plain object', () => {
      // Arrange
      const plain = { rank: 13, isJoker: true };

      // Act
      const card = Card.fromPlainObject(plain);

      // Assert
      expect(card.rank).toBe(13);
      expect(card.isJoker).toBe(true);
    });

    it('should throw error for invalid rank in plain object', () => {
      // Arrange
      const plain = { rank: 15, isJoker: false };

      // Act & Assert
      expect(() => Card.fromPlainObject(plain)).toThrow('Card rank must be between 1 and 13');
    });
  });
});
