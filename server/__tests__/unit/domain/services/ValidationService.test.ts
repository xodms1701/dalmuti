/**
 * ValidationService Unit Tests
 */

import * as ValidationService from '../../../../src/domain/services/ValidationService';
import { Game } from '../../../../src/domain/entities/Game';
import { Player } from '../../../../src/domain/entities/Player';
import { Card } from '../../../../src/domain/entities/Card';
import { RoomId } from '../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';

describe('ValidationService', () => {
  describe('validateGameState', () => {
    it('should return success when phase matches', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.changePhase('playing');

      // Act
      const result = ValidationService.validateGameState(game, 'playing');

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when phase does not match', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.changePhase('waiting');

      // Act
      const result = ValidationService.validateGameState(game, 'playing');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('playing');
      expect(result.error).toContain('waiting');
    });

    it('should validate waiting phase', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));

      // Act
      const result = ValidationService.validateGameState(game, 'waiting');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('validatePlayerAction', () => {
    it('should return success when all conditions are met', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = ValidationService.validatePlayerAction(game, 'player1');

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when player not found', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.changePhase('playing');

      // Act
      const result = ValidationService.validatePlayerAction(game, 'player1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when not player turn', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player2'));

      // Act
      const result = ValidationService.validatePlayerAction(game, 'player1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when player has passed', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.pass();
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = ValidationService.validatePlayerAction(game, 'player1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when player has finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const result = ValidationService.validatePlayerAction(game, 'player1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateCards', () => {
    it('should return success for valid single card', () => {
      // Arrange
      const cards = [{ rank: 5, isJoker: false }];

      // Act
      const result = ValidationService.validateCards(cards);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return success for valid multiple cards of same rank', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 5, isJoker: false },
      ];

      // Act
      const result = ValidationService.validateCards(cards);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error for empty cards array', () => {
      // Arrange
      const cards: any[] = [];

      // Act
      const result = ValidationService.validateCards(cards);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for cards of different ranks', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
      ];

      // Act
      const result = ValidationService.validateCards(cards);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate against lastPlay card count', () => {
      // Arrange
      const cards = [{ rank: 5, isJoker: false }];
      const lastPlay = {
        playerId: 'player2',
        cards: [
          { rank: 7, isJoker: false },
          { rank: 7, isJoker: false },
        ],
      };

      // Act
      const result = ValidationService.validateCards(cards, lastPlay);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate card strength against lastPlay', () => {
      // Arrange
      const cards = [{ rank: 10, isJoker: false }];
      const lastPlay = {
        playerId: 'player2',
        cards: [{ rank: 5, isJoker: false }],
      };

      // Act
      const result = ValidationService.validateCards(cards, lastPlay);

      // Assert
      expect(result.success).toBe(false); // 10 is weaker than 5
    });

    it('should return success when cards are stronger than lastPlay', () => {
      // Arrange
      const cards = [{ rank: 3, isJoker: false }];
      const lastPlay = {
        playerId: 'player2',
        cards: [{ rank: 7, isJoker: false }],
      };

      // Act
      const result = ValidationService.validateCards(cards, lastPlay);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle cards with jokers', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 13, isJoker: true },
      ];

      // Act
      const result = ValidationService.validateCards(cards);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('validateSameRank', () => {
    it('should return success for cards of same rank', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 5, isJoker: false },
      ];

      // Act
      const result = ValidationService.validateSameRank(cards);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error for cards of different ranks', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
      ];

      // Act
      const result = ValidationService.validateSameRank(cards);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should allow jokers with other cards', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 13, isJoker: true },
      ];

      // Act
      const result = ValidationService.validateSameRank(cards);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('validatePlayerHasCards', () => {
    it('should return success when player has the cards', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([
        Card.create(5, false),
        Card.create(7, false),
      ]);
      game.addPlayer(player);

      // Act
      const result = ValidationService.validatePlayerHasCards(game, PlayerId.create('player1'), [
        Card.create(5, false),
      ]);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when player does not have the cards', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.assignCards([Card.create(5, false)]);
      game.addPlayer(player);

      // Act
      const result = ValidationService.validatePlayerHasCards(game, PlayerId.create('player1'), [
        Card.create(7, false),
      ]);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should return error when player not found', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));

      // Act
      const result = ValidationService.validatePlayerHasCards(game, PlayerId.create('player1'), [
        Card.create(5, false),
      ]);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateMinPlayers', () => {
    it('should return success when player count meets minimum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Bob'));

      // Act
      const result = ValidationService.validateMinPlayers(game, 2);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when player count is below minimum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));

      // Act
      const result = ValidationService.validateMinPlayers(game, 4);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should return success when player count exceeds minimum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Bob'));
      game.addPlayer(Player.create(PlayerId.create('player3'), 'Charlie'));

      // Act
      const result = ValidationService.validateMinPlayers(game, 2);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('validateMaxPlayers', () => {
    it('should return success when player count is below maximum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Bob'));

      // Act
      const result = ValidationService.validateMaxPlayers(game, 4);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when player count equals maximum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Bob'));

      // Act
      const result = ValidationService.validateMaxPlayers(game, 2);

      // Assert
      expect(result.success).toBe(false); // >= maxPlayers fails
    });

    it('should return error when player count exceeds maximum', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Alice'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Bob'));
      game.addPlayer(Player.create(PlayerId.create('player3'), 'Charlie'));

      // Act
      const result = ValidationService.validateMaxPlayers(game, 2);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateAllPlayersReady', () => {
    it('should return success when all players are ready', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      player1.ready();
      player2.ready();
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const result = ValidationService.validateAllPlayersReady(game);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return error when not all players are ready', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      player1.ready();
      // player2 is not ready
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const result = ValidationService.validateAllPlayersReady(game);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should return error when no players are ready', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const result = ValidationService.validateAllPlayersReady(game);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should return success with single ready player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      player1.ready();
      game.addPlayer(player1);

      // Act
      const result = ValidationService.validateAllPlayersReady(game);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('ValidationResult structure', () => {
    it('should return correct structure for success', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));

      // Act
      const result = ValidationService.validateGameState(game, 'waiting');

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should return correct structure for failure', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));

      // Act
      const result = ValidationService.validateGameState(game, 'playing');

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });
});
