/**
 * TurnService Unit Tests
 */

import * as TurnService from '../../../../src/domain/services/TurnService';
import { Game } from '../../../../src/domain/entities/Game';
import { Player } from '../../../../src/domain/entities/Player';
import { Card } from '../../../../src/domain/entities/Card';
import { RoomId } from '../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';

describe('TurnService', () => {
  describe('findNextPlayer', () => {
    it('should find next active player in rank order', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.assignRank(1);
      player1.assignCards([Card.create(5, false)]);
      player2.assignRank(2);
      player2.assignCards([Card.create(7, false)]);
      player3.assignRank(3);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);

      // Act
      const nextPlayerId = TurnService.findNextPlayer(game, 'player1');

      // Assert
      expect(nextPlayerId).toBe('player2');
    });

    it('should skip players who have finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.assignRank(1);
      player1.assignCards([Card.create(5, false)]);
      player2.assignRank(2);
      player2.assignCards([]); // Finished
      player3.assignRank(3);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const nextPlayerId = TurnService.findNextPlayer(game, 'player1');

      // Assert
      expect(nextPlayerId).toBe('player3');
    });

    it('should wrap around to first player when at end', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(1);
      player1.assignCards([Card.create(5, false)]);
      player2.assignRank(2);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const nextPlayerId = TurnService.findNextPlayer(game, 'player2');

      // Assert
      expect(nextPlayerId).toBe('player1');
    });

    it('should return null when no active players remain', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(1);
      player1.assignCards([]);
      player2.assignRank(2);
      player2.assignCards([]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const nextPlayerId = TurnService.findNextPlayer(game, 'player1');

      // Assert
      expect(nextPlayerId).toBeNull();
    });

    it('should return null when only current player is active', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(1);
      player1.assignCards([Card.create(5, false)]);
      player2.assignRank(2);
      player2.assignCards([]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const nextPlayerId = TurnService.findNextPlayer(game, 'player1');

      // Assert
      expect(nextPlayerId).toBeNull();
    });
  });

  describe('allPlayersPassedExceptLast', () => {
    it('should return true when all players except last player have passed', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.pass();
      player2.pass();
      // player3 is the last player who played

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);

      // Set lastPlay to player3
      game.setLastPlay({
        playerId: PlayerId.create('player3'),
        cards: [Card.create(3, false)],
      });

      // Act
      const result = TurnService.allPlayersPassedExceptLast(game);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no players have passed', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const result = TurnService.allPlayersPassedExceptLast(game);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when multiple players have not passed', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.pass();
      // player2 and player3 have not passed

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);

      // Act
      const result = TurnService.allPlayersPassedExceptLast(game);

      // Assert
      expect(result).toBe(false);
    });

    it('should exclude finished players from check', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.pass();
      player2.assignCards([]); // Finished
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Set lastPlay to player3
      game.setLastPlay({
        playerId: PlayerId.create('player3'),
        cards: [Card.create(3, false)],
      });

      // Act
      const result = TurnService.allPlayersPassedExceptLast(game);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('startNewRound', () => {
    it('should increment round number', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const initialRound = game.round;

      // Act
      TurnService.startNewRound(game);

      // Assert
      expect(game.round).toBe(initialRound + 1);
    });

    it('should clear lastPlay', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      game.setLastPlay({
        playerId: PlayerId.create('player1'),
        cards: [Card.create(5, false)],
      });

      // Act
      TurnService.startNewRound(game);

      // Assert
      expect(game.lastPlay).toBeUndefined();
    });

    it('should reset pass status for all active players', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.pass();
      player2.pass();
      player1.assignRank(1);
      player2.assignRank(2);
      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      TurnService.startNewRound(game);

      // Assert
      const updatedPlayer1 = game.getPlayer(PlayerId.create('player1'));
      const updatedPlayer2 = game.getPlayer(PlayerId.create('player2'));
      expect(updatedPlayer1?.isPassed).toBe(false);
      expect(updatedPlayer2?.isPassed).toBe(false);
    });

    it('should not reset pass status for finished players', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.pass();
      player2.pass();
      player1.assignCards([]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      TurnService.startNewRound(game);

      // Assert
      const updatedPlayer1 = game.getPlayer(PlayerId.create('player1'));
      const updatedPlayer2 = game.getPlayer(PlayerId.create('player2'));
      expect(updatedPlayer1?.isPassed).toBe(true); // Should remain passed
      expect(updatedPlayer2?.isPassed).toBe(false); // Should be reset
    });

    it('should set current turn to active player after last player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(1);
      player2.assignRank(2);
      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.setLastPlay({
        playerId: PlayerId.create('player1'),
        cards: [Card.create(5, false)],
      });

      // Act
      TurnService.startNewRound(game);

      // Assert
      // findNextPlayerFrom starts from player1 and returns first active, which is player1
      expect(game.currentTurn?.value).toBe('player1');
    });
  });

  describe('getSortedPlayers', () => {
    it('should sort players by rank in ascending order', () => {
      // Arrange
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.assignRank(3);
      player2.assignRank(1);
      player3.assignRank(2);

      const players = [player1, player2, player3];

      // Act
      const sorted = TurnService.getSortedPlayers(players);

      // Assert
      expect(sorted[0].id.value).toBe('player2'); // Rank 1
      expect(sorted[1].id.value).toBe('player3'); // Rank 2
      expect(sorted[2].id.value).toBe('player1'); // Rank 3
    });

    it('should return Player entities', () => {
      // Arrange
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(2);
      player2.assignRank(1);

      const players = [player1, player2];

      // Act
      const sorted = TurnService.getSortedPlayers(players);

      // Assert
      expect(sorted[0]).toBeInstanceOf(Player);
      expect(sorted[1]).toBeInstanceOf(Player);
    });

    it('should handle empty array', () => {
      // Arrange
      const players: Player[] = [];

      // Act
      const sorted = TurnService.getSortedPlayers(players);

      // Assert
      expect(sorted).toEqual([]);
    });

    it('should handle single player', () => {
      // Arrange
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      player1.assignRank(1);
      const players = [player1];

      // Act
      const sorted = TurnService.getSortedPlayers(players);

      // Assert
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id.value).toBe('player1');
    });
  });

  describe('countActivePlayers', () => {
    it('should count players who have not finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([]);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const count = TurnService.countActivePlayers(game);

      // Assert
      expect(count).toBe(2);
    });

    it('should return 0 when all players have finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([]);
      player2.assignCards([]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const count = TurnService.countActivePlayers(game);

      // Assert
      expect(count).toBe(0);
    });

    it('should return total count when no players have finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const count = TurnService.countActivePlayers(game);

      // Assert
      expect(count).toBe(2);
    });
  });

  describe('getLastActivePlayer', () => {
    it('should return the last remaining active player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const lastActive = TurnService.getLastActivePlayer(game);

      // Assert
      expect(lastActive).not.toBeNull();
      expect(lastActive?.id.value).toBe('player2');
    });

    it('should return null when no active players remain', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([]);
      player2.assignCards([]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player2'));

      // Act
      const lastActive = TurnService.getLastActivePlayer(game);

      // Assert
      expect(lastActive).toBeNull();
    });

    it('should return null when multiple active players remain', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignCards([Card.create(5, false)]);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const lastActive = TurnService.getLastActivePlayer(game);

      // Assert
      expect(lastActive).toBeNull();
    });
  });

  describe('findFirstActivePlayer', () => {
    it('should find first active player by rank', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');

      player1.assignRank(3);
      player1.assignCards([]);
      player2.assignRank(1);
      player2.assignCards([Card.create(7, false)]);
      player3.assignRank(2);
      player3.assignCards([Card.create(3, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const firstActive = TurnService.findFirstActivePlayer(game);

      // Assert
      expect(firstActive).toBe('player2');
    });

    it('should return null when no active players', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');

      player1.assignCards([]);
      game.addPlayer(player1);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const firstActive = TurnService.findFirstActivePlayer(game);

      // Assert
      expect(firstActive).toBeNull();
    });

    it('should return first player when all are active', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      player1.assignRank(2);
      player1.assignCards([Card.create(5, false)]);
      player2.assignRank(1);
      player2.assignCards([Card.create(7, false)]);

      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const firstActive = TurnService.findFirstActivePlayer(game);

      // Assert
      expect(firstActive).toBe('player2'); // Rank 1 is first
    });
  });
});
