/**
 * Player Entity Unit Tests
 */

import { Player } from '../../../../src/domain/entities/Player';
import { Card } from '../../../../src/domain/entities/Card';
import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';

describe('Player', () => {
  describe('create', () => {
    it('should create a player with valid id and nickname', () => {
      // Arrange & Act
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Assert
      expect(player.id.value).toBe('player1');
      expect(player.nickname).toBe('Alice');
      expect(player.cards).toEqual([]);
      expect(player.role).toBeNull();
      expect(player.rank).toBeNull();
      expect(player.isPassed).toBe(false);
      expect(player.isReady).toBe(false);
    });

    it('should throw error when id is empty', () => {
      // Arrange & Act & Assert
      expect(() => Player.create(PlayerId.create(''), 'Alice')).toThrow();
    });

    it('should throw error when id is only whitespace', () => {
      // Arrange & Act & Assert
      expect(() => Player.create(PlayerId.create('   '), 'Alice')).toThrow();
    });

    it('should throw error when nickname is empty', () => {
      // Arrange & Act & Assert
      expect(() => Player.create(PlayerId.create('player1'), '')).toThrow('Player nickname cannot be empty');
    });

    it('should throw error when nickname is only whitespace', () => {
      // Arrange & Act & Assert
      expect(() => Player.create(PlayerId.create('player1'), '   ')).toThrow('Player nickname cannot be empty');
    });
  });

  describe('playCards', () => {
    it('should remove played cards from player hand', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      const cards = [
        Card.create(5, false),
        Card.create(5, false),
      ];
      player.assignCards(cards);

      // Act
      player.playCards([Card.create(5, false)]);

      // Assert
      expect(player.cards).toHaveLength(1);
      expect(player.cards[0].rank).toBe(5);
    });

    it('should reset pass status when playing cards', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);
      player.pass();

      // Act
      player.playCards([Card.create(5, false)]);

      // Assert
      expect(player.isPassed).toBe(false);
    });

    it('should throw error when playing empty cards array', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act & Assert
      expect(() => player.playCards([])).toThrow('Cannot play empty cards');
    });

    it('should throw error when playing cards player does not have', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);

      // Act & Assert
      expect(() => player.playCards([Card.create(7, false)])).toThrow(
        'Player does not have card: 7'
      );
    });

    it('should handle playing multiple cards of same rank', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      const cards = [
        Card.create(5, false),
        Card.create(5, false),
        Card.create(5, false),
      ];
      player.assignCards(cards);

      // Act
      player.playCards([
        Card.create(5, false),
        Card.create(5, false),
      ]);

      // Assert
      expect(player.cards).toHaveLength(1);
    });

    it('should handle playing joker', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(13, true)]);

      // Act
      player.playCards([Card.create(13, true)]);

      // Assert
      expect(player.cards).toHaveLength(0);
    });
  });

  describe('pass', () => {
    it('should set isPassed to true', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.pass();

      // Assert
      expect(player.isPassed).toBe(true);
    });
  });

  describe('resetPass', () => {
    it('should set isPassed to false', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.pass();

      // Act
      player.resetPass();

      // Assert
      expect(player.isPassed).toBe(false);
    });
  });

  describe('ready / unready', () => {
    it('should set isReady to true when ready is called', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.ready();

      // Assert
      expect(player.isReady).toBe(true);
    });

    it('should set isReady to false when unready is called', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.ready();

      // Act
      player.unready();

      // Assert
      expect(player.isReady).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign valid role (1-13)', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.assignRole(5);

      // Assert
      expect(player.role).toBe(5);
    });

    it('should assign role 1', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.assignRole(1);

      // Assert
      expect(player.role).toBe(1);
    });

    it('should assign role 13', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.assignRole(13);

      // Assert
      expect(player.role).toBe(13);
    });

    it('should throw error when role is less than 1', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act & Assert
      expect(() => player.assignRole(0)).toThrow('Role must be between 1 and 13');
    });

    it('should throw error when role is greater than 13', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act & Assert
      expect(() => player.assignRole(14)).toThrow('Role must be between 1 and 13');
    });
  });

  describe('assignRank', () => {
    it('should assign valid rank', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.assignRank(3);

      // Assert
      expect(player.rank).toBe(3);
    });

    it('should assign rank 1 (highest rank)', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      player.assignRank(1);

      // Assert
      expect(player.rank).toBe(1);
    });

    it('should throw error when rank is less than 1', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act & Assert
      expect(() => player.assignRank(0)).toThrow('Rank must be greater than 0');
    });

    it('should throw error when rank is negative', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act & Assert
      expect(() => player.assignRank(-1)).toThrow('Rank must be greater than 0');
    });
  });

  describe('assignCards / addCards', () => {
    it('should assign cards to player', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      const cards = [
        Card.create(5, false),
        Card.create(7, false),
      ];

      // Act
      player.assignCards(cards);

      // Assert
      expect(player.cards).toHaveLength(2);
      expect(player.cards).toEqual(cards);
    });

    it('should replace existing cards when assigning', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(3, false)]);

      // Act
      player.assignCards([Card.create(5, false)]);

      // Assert
      expect(player.cards).toHaveLength(1);
      expect(player.cards[0].rank).toBe(5);
    });

    it('should add cards to existing hand', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(3, false)]);

      // Act
      player.addCards([Card.create(5, false)]);

      // Assert
      expect(player.cards).toHaveLength(2);
      expect(player.cards[0].rank).toBe(3);
      expect(player.cards[1].rank).toBe(5);
    });
  });

  describe('hasFinished', () => {
    it('should return true when player has no cards', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([]);

      // Act
      const result = player.hasFinished();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when player has cards', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);

      // Act
      const result = player.hasFinished();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true after playing all cards', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);

      // Act
      player.playCards([Card.create(5, false)]);
      const result = player.hasFinished();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('toPlainObject', () => {
    it('should convert player to plain object', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);
      player.assignRole(3);
      player.assignRank(2);
      player.ready();

      // Act
      const plain = player.toPlainObject();

      // Assert
      expect(plain).toEqual({
        id: 'player1',
        nickname: 'Alice',
        cards: [{ rank: 5, isJoker: false }],
        role: 3,
        rank: 2,
        isPassed: false,
        isReady: true,
      });
    });
  });

  describe('fromPlainObject', () => {
    it('should create player from plain object', () => {
      // Arrange
      const plain = {
        id: 'player1',
        nickname: 'Alice',
        cards: [{ rank: 5, isJoker: false }],
        role: 3,
        rank: 2,
        isPassed: true,
        isReady: true,
      };

      // Act
      const player = Player.fromPlainObject(plain);

      // Assert
      expect(player.id.value).toBe('player1');
      expect(player.nickname).toBe('Alice');
      expect(player.cards).toHaveLength(1);
      expect(player.role).toBe(3);
      expect(player.rank).toBe(2);
      expect(player.isPassed).toBe(true);
      expect(player.isReady).toBe(true);
    });

    it('should handle minimal plain object', () => {
      // Arrange
      const plain = {
        id: 'player1',
        nickname: 'Alice',
      };

      // Act
      const player = Player.fromPlainObject(plain);

      // Assert
      expect(player.id.value).toBe('player1');
      expect(player.nickname).toBe('Alice');
      expect(player.cards).toEqual([]);
      expect(player.role).toBeNull();
      expect(player.rank).toBeNull();
      expect(player.isPassed).toBe(false);
      expect(player.isReady).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should return a copy of cards array', () => {
      // Arrange
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      const cards = [Card.create(5, false)];
      player.assignCards(cards);

      // Act
      const playerCards = player.cards;
      playerCards.push(Card.create(7, false));

      // Assert
      expect(player.cards).toHaveLength(1);
    });
  });
});
