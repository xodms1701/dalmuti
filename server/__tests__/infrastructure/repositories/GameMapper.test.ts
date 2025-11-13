/**
 * GameMapper Unit Tests
 *
 * Domain Entity ↔ MongoDB Document 변환 테스트
 */

import { GameMapper, GameDocument } from '../../../src/infrastructure/repositories/GameMapper';
import { Game } from '../../../src/domain/entities/Game';
import { Player } from '../../../src/domain/entities/Player';
import { RoomId } from '../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../src/domain/value-objects/PlayerId';

describe('GameMapper', () => {
  describe('toDocument', () => {
    it('should convert Game entity to MongoDB document', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.changePhase('waiting');

      // Act
      const document = GameMapper.toDocument(game);

      // Assert
      expect(document._id).toBe('ROOM01');
      expect(document.players).toHaveLength(2);
      expect(document.phase).toBe('waiting');
      expect(document.round).toBe(0);
      expect(document.finishedPlayers).toEqual([]);
      expect(document.updatedAt).toBeInstanceOf(Date);
    });

    it('should map roomId to _id', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM02'));

      // Act
      const document = GameMapper.toDocument(game);

      // Assert
      expect(document._id).toBe('ROOM02');
      expect(document).not.toHaveProperty('roomId');
    });

    it('should convert players using toPlainObject', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM03'));
      const player = Player.create(PlayerId.create('p1'), 'TestPlayer');
      player.assignRole(5);
      player.assignRank(2);
      player.assignCards([
        { rank: 3, isJoker: false },
        { rank: 4, isJoker: false },
      ] as any[]);
      game.addPlayer(player);

      // Act
      const document = GameMapper.toDocument(game);

      // Assert
      expect(document.players[0]).toEqual({
        id: 'p1',
        nickname: 'TestPlayer',
        cards: [
          { rank: 3, isJoker: false },
          { rank: 4, isJoker: false },
        ],
        role: 5,
        rank: 2,
        isPassed: false,
        isReady: false,
      });
    });

    it('should handle game with lastPlay', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM04'));
      game.setLastPlay({
        playerId: PlayerId.create('player1'),
        cards: [{ rank: 5, isJoker: false }],
      });

      // Act
      const document = GameMapper.toDocument(game);

      // Assert
      expect(document.lastPlay).toEqual({
        playerId: 'player1',
        cards: [{ rank: 5, isJoker: false }],
      });
    });

    it('should handle optional fields', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM05'));
      game.setSelectableDecks([
        { cards: [{ rank: 1, isJoker: false }], isSelected: false },
      ]);
      game.setRoleSelectionCards([
        { number: 1, isSelected: false },
      ]);

      // Act
      const document = GameMapper.toDocument(game);

      // Assert
      expect(document.selectableDecks).toBeDefined();
      expect(document.roleSelectionCards).toBeDefined();
    });
  });

  describe('toDomain', () => {
    it('should convert MongoDB document to Game entity', () => {
      // Arrange
      const document: GameDocument = {
        _id: 'ROOM06',
        players: [
          {
            id: 'player1',
            nickname: 'Alice',
            cards: [],
            role: null,
            rank: null,
            isPassed: false,
            isReady: false,
          },
        ],
        phase: 'waiting',
        currentTurn: null,
        deck: [],
        round: 0,
        finishedPlayers: [],
      };

      // Act
      const game = GameMapper.toDomain(document);

      // Assert
      expect(game).toBeInstanceOf(Game);
      expect(game.roomId.value).toBe('ROOM06');
      expect(game.players).toHaveLength(1);
      expect(game.phase).toBe('waiting');
    });

    it('should map _id to roomId', () => {
      // Arrange
      const document: GameDocument = {
        _id: 'ROOM07',
        players: [],
        phase: 'waiting',
        currentTurn: null,
        deck: [],
        round: 0,
        finishedPlayers: [],
      };

      // Act
      const game = GameMapper.toDomain(document);

      // Assert
      expect(game.roomId.value).toBe('ROOM07');
    });

    it('should reconstruct Player entities', () => {
      // Arrange
      const document: GameDocument = {
        _id: 'ROOM08',
        players: [
          {
            id: 'p1',
            nickname: 'TestPlayer',
            cards: [{ rank: 3, isJoker: false }],
            role: 7,
            rank: 3,
            isPassed: true,
            isReady: true,
          },
        ],
        phase: 'playing',
        currentTurn: 'p1',
        deck: [],
        round: 1,
        finishedPlayers: [],
      };

      // Act
      const game = GameMapper.toDomain(document);

      // Assert
      const player = game.getPlayer(PlayerId.create('p1'));
      expect(player).toBeDefined();
      expect(player!.id.value).toBe('p1');
      expect(player!.nickname).toBe('TestPlayer');
      expect(player!.role).toBe(7);
      expect(player!.rank).toBe(3);
      expect(player!.isPassed).toBe(true);
      expect(player!.isReady).toBe(true);
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const document: GameDocument = {
        _id: 'ROOM09',
        players: [],
        phase: 'waiting',
        currentTurn: null,
        deck: [],
        round: 0,
        finishedPlayers: [],
      };

      // Act
      const game = GameMapper.toDomain(document);

      // Assert
      expect(game.selectableDecks).toBeUndefined();
      expect(game.roleSelectionCards).toBeUndefined();
      expect(game.lastPlay).toBeUndefined();
    });

    it('should handle all optional fields present', () => {
      // Arrange
      const document: GameDocument = {
        _id: 'ROOM10',
        players: [],
        phase: 'playing',
        currentTurn: 'p1',
        lastPlay: {
          playerId: 'p1',
          cards: [{ rank: 5, isJoker: false }],
        },
        deck: [],
        round: 2,
        finishedPlayers: ['p2'],
        selectableDecks: [
          { cards: [], isSelected: true, selectedBy: 'p1' },
        ],
        roleSelectionCards: [
          { number: 1, isSelected: true, selectedBy: 'p1' },
        ],
      };

      // Act
      const game = GameMapper.toDomain(document);

      // Assert
      expect(game.lastPlay?.playerId.value).toBe('p1');
      expect(game.lastPlay?.cards).toEqual([{ rank: 5, isJoker: false }]);
      expect(game.selectableDecks).toBeDefined();
      expect(game.roleSelectionCards).toBeDefined();
      expect(game.finishedPlayers.map(p => p.value)).toEqual(['p2']);
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve game state through round-trip conversion', () => {
      // Arrange
      const originalGame = Game.create(RoomId.from('ROOM11'));
      const player1 = Player.create(PlayerId.create('p1'), 'Alice');
      const player2 = Player.create(PlayerId.create('p2'), 'Bob');

      player1.assignRole(3);
      player1.assignRank(1);
      player1.assignCards([
        { rank: 1, isJoker: false },
        { rank: 2, isJoker: false },
      ] as any[]);

      player2.assignRole(7);
      player2.assignRank(2);

      originalGame.addPlayer(player1);
      originalGame.addPlayer(player2);
      originalGame.changePhase('playing');
      originalGame.setCurrentTurn(PlayerId.create('p1'));
      originalGame.incrementRound();
      originalGame.setLastPlay({
        playerId: PlayerId.create('p1'),
        cards: [{ rank: 1, isJoker: false }],
      });

      // Act
      const document = GameMapper.toDocument(originalGame);
      const reconstructedGame = GameMapper.toDomain(document);

      // Assert
      expect(reconstructedGame.roomId.value).toBe(originalGame.roomId.value);
      expect(reconstructedGame.phase).toBe(originalGame.phase);
      expect(reconstructedGame.currentTurn?.value).toBe(originalGame.currentTurn?.value);
      expect(reconstructedGame.round).toBe(originalGame.round);
      expect(reconstructedGame.players).toHaveLength(originalGame.players.length);
      expect(reconstructedGame.lastPlay?.playerId.value).toBe(originalGame.lastPlay?.playerId.value);
      expect(reconstructedGame.lastPlay?.cards).toEqual(originalGame.lastPlay?.cards);

      // Player 상세 비교
      const origPlayer1 = originalGame.getPlayer(PlayerId.create('p1'))!;
      const reconPlayer1 = reconstructedGame.getPlayer(PlayerId.create('p1'))!;

      expect(reconPlayer1.id.value).toBe(origPlayer1.id.value);
      expect(reconPlayer1.nickname).toBe(origPlayer1.nickname);
      expect(reconPlayer1.role).toBe(origPlayer1.role);
      expect(reconPlayer1.rank).toBe(origPlayer1.rank);
      expect(reconPlayer1.cards).toEqual(origPlayer1.cards);
    });
  });

  describe('toUpdateDocument', () => {
    it('should convert partial updates to MongoDB update document', () => {
      // Arrange
      const updates = {
        phase: 'playing',
        currentTurn: PlayerId.create('player1'),
        round: 2,
      };

      // Act
      const updateDoc = GameMapper.toUpdateDocument(updates);

      // Assert
      expect(updateDoc.phase).toBe('playing');
      expect(updateDoc.currentTurn).toBe('player1');
      expect(updateDoc.round).toBe(2);
      expect(updateDoc.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle empty updates', () => {
      // Arrange
      const updates = {};

      // Act
      const updateDoc = GameMapper.toUpdateDocument(updates);

      // Assert
      expect(updateDoc.updatedAt).toBeInstanceOf(Date);
      expect(Object.keys(updateDoc)).toEqual(['updatedAt']);
    });

    it('should handle lastPlay update', () => {
      // Arrange
      const updates = {
        lastPlay: {
          playerId: PlayerId.create('p1'),
          cards: [{ rank: 3, isJoker: false }],
        },
      };

      // Act
      const updateDoc = GameMapper.toUpdateDocument(updates);

      // Assert
      expect(updateDoc.lastPlay).toEqual({
        playerId: 'p1',
        cards: [{ rank: 3, isJoker: false }],
      });
    });

    it('should handle all updatable fields', () => {
      // Arrange
      const updates = {
        phase: 'gameEnd',
        currentTurn: PlayerId.create('p2'),
        lastPlay: { playerId: PlayerId.create('p1'), cards: [] },
        deck: [{ rank: 5, isJoker: false }],
        round: 3,
        finishedPlayers: [PlayerId.create('p1'), PlayerId.create('p2')],
        selectableDecks: [{ cards: [], isSelected: true }],
        roleSelectionCards: [{ number: 1, isSelected: true }],
        players: [
          {
            id: 'p1',
            nickname: 'Alice',
            cards: [],
            role: null,
            rank: null,
            isPassed: false,
            isReady: false,
          },
        ],
      } as any;

      // Act
      const updateDoc = GameMapper.toUpdateDocument(updates);

      // Assert
      expect(updateDoc.phase).toBe('gameEnd');
      expect(updateDoc.currentTurn).toBe('p2');
      expect(updateDoc.lastPlay).toBeDefined();
      expect(updateDoc.deck).toBeDefined();
      expect(updateDoc.round).toBe(3);
      expect(updateDoc.finishedPlayers).toEqual(['p1', 'p2']);
      expect(updateDoc.selectableDecks).toBeDefined();
      expect(updateDoc.roleSelectionCards).toBeDefined();
      expect(updateDoc.players).toBeDefined();
      expect(updateDoc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
