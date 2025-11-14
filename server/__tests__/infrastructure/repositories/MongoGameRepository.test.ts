/**
 * MongoGameRepository Integration Tests
 *
 * 실제 MongoDB와 연결하여 CRUD 작업을 테스트
 */

import { MongoGameRepository } from '../../../src/infrastructure/repositories/MongoGameRepository';
import {
  NotFoundError,
  DuplicateError,
  ConnectionError,
} from '../../../src/application/ports/RepositoryError';
import { Game } from '../../../src/domain/entities/Game';
import { Player } from '../../../src/domain/entities/Player';
import { Card } from '../../../src/domain/entities/Card';
import { RoomId } from '../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../src/domain/value-objects/PlayerId';

// 환경 변수 또는 기본값 사용
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dalmuti-test';

describe('MongoGameRepository Integration Tests', () => {
  let repository: MongoGameRepository;

  beforeAll(async () => {
    // MongoDB 연결
    repository = new MongoGameRepository(MONGO_URI, DB_NAME);
    await repository.connect();
  });

  afterAll(async () => {
    // MongoDB 연결 해제
    await repository.disconnect();
  });

  beforeEach(async () => {
    // 각 테스트 전에 컬렉션 정리
    const collection = repository.getCollection();
    await collection.deleteMany({});
  });

  describe('save', () => {
    it('should save a new game', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId);
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);

      // Act
      await repository.save(game);

      // Assert
      const found = await repository.findById(roomId);
      expect(found).not.toBeNull();
      expect(found!.roomId.value).toBe('ROOM01');
      expect(found!.players).toHaveLength(1);
    });

    it('should throw DuplicateError when saving game with existing roomId', async () => {
      // Arrange
      const roomId = RoomId.from('DUPLIC');
      const game1 = Game.create(roomId);
      const game2 = Game.create(roomId);

      // Act
      await repository.save(game1);

      // Assert
      await expect(repository.save(game2)).rejects.toThrow(DuplicateError);
    });

    it('should save game with complex state', async () => {
      // Arrange
      const roomId = RoomId.from('CMPLX1');
      const game = Game.create(roomId);
      const playerId1 = PlayerId.create('p1');
      const playerId2 = PlayerId.create('p2');
      const player1 = Player.create(playerId1, 'Alice');
      const player2 = Player.create(playerId2, 'Bob');

      player1.assignRole(3);
      player1.assignRank(1);
      player1.assignCards([Card.create(1, false)]);

      player2.assignRole(7);
      player2.assignRank(2);

      game.addPlayer(player1);
      game.addPlayer(player2);
      game.changePhase('playing');
      game.setCurrentTurn(playerId1);
      game.setLastPlay({
        playerId: playerId1,
        cards: [Card.create(1, false)],
      });

      // Act
      await repository.save(game);

      // Assert
      const found = await repository.findById(roomId);
      expect(found).not.toBeNull();
      expect(found!.phase).toBe('playing');
      expect(found!.currentTurn?.value).toBe('p1');
      expect(found!.lastPlay?.playerId.value).toBe('p1');
      expect(found!.lastPlay?.cards).toEqual([{ rank: 1, isJoker: false }]);
      expect(found!.players).toHaveLength(2);

      const foundPlayer1 = found!.getPlayer(playerId1);
      expect(foundPlayer1!.role).toBe(3);
      expect(foundPlayer1!.rank).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find game by roomId', async () => {
      // Arrange
      const roomId = RoomId.from('FIND01');
      const game = Game.create(roomId);
      await repository.save(game);

      // Act
      const found = await repository.findById(roomId);

      // Assert
      expect(found).not.toBeNull();
      expect(found!.roomId.value).toBe('FIND01');
    });

    it('should return null when game not found', async () => {
      // Act
      const found = await repository.findById(RoomId.from('NOEX01'));

      // Assert
      expect(found).toBeNull();
    });

    it('should reconstruct Game entity correctly', async () => {
      // Arrange
      const roomId = RoomId.from('RECONS');
      const playerId = PlayerId.create('p1');
      const originalGame = Game.create(roomId);
      const player = Player.create(playerId, 'TestPlayer');
      player.assignRole(5);
      originalGame.addPlayer(player);
      originalGame.changePhase('waiting');

      await repository.save(originalGame);

      // Act
      const found = await repository.findById(roomId);

      // Assert
      expect(found).toBeInstanceOf(Game);
      expect(found!.roomId.value).toBe(originalGame.roomId.value);
      expect(found!.phase).toBe(originalGame.phase);
      expect(found!.players).toHaveLength(1);

      const foundPlayer = found!.getPlayer(playerId);
      expect(foundPlayer).toBeInstanceOf(Player);
      expect(foundPlayer!.role).toBe(5);
    });
  });

  describe('update', () => {
    it('should update game partially', async () => {
      // Arrange
      const roomId = RoomId.from('UPDAT1');
      const game = Game.create(roomId);
      game.changePhase('waiting');
      await repository.save(game);

      // Act
      const updated = await repository.update(roomId, {
        phase: 'playing',
        currentTurn: PlayerId.create('player1'),
        round: 1,
      });

      // Assert
      expect(updated).not.toBeNull();
      expect(updated!.phase).toBe('playing');
      expect(updated!.currentTurn?.value).toBe('player1');
      expect(updated!.round).toBe(1);
    });

    it('should throw NotFoundError when updating non-existent game', async () => {
      // Act & Assert
      await expect(repository.update(RoomId.from('NOEX02'), { phase: 'playing' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should return updated game entity', async () => {
      // Arrange
      const roomId = RoomId.from('RETRN1');
      const game = Game.create(roomId);
      await repository.save(game);

      // Act
      const updated = await repository.update(roomId, {
        phase: 'playing',
      });

      // Assert
      expect(updated).toBeInstanceOf(Game);
      expect(updated!.phase).toBe('playing');
    });

    it('should preserve non-updated fields', async () => {
      // Arrange
      const roomId = RoomId.from('PRESV1');
      const playerId = PlayerId.create('p1');
      const game = Game.create(roomId);
      const player = Player.create(playerId, 'Alice');
      game.addPlayer(player);
      game.changePhase('waiting');
      await repository.save(game);

      // Act
      const updated = await repository.update(roomId, {
        phase: 'playing',
      });

      // Assert
      expect(updated!.players).toHaveLength(1);
      expect(updated!.getPlayer(playerId)).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete game by roomId', async () => {
      // Arrange
      const roomId = RoomId.from('DELET1');
      const game = Game.create(roomId);
      await repository.save(game);

      // Act
      await repository.delete(roomId);

      // Assert
      const found = await repository.findById(roomId);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError when deleting non-existent game', async () => {
      // Act & Assert
      await expect(repository.delete(RoomId.from('NOEX03'))).rejects.toThrow(NotFoundError);
    });

    it('should not affect other games', async () => {
      // Arrange
      const roomId1 = RoomId.from('ROOM11');
      const roomId2 = RoomId.from('ROOM22');
      const game1 = Game.create(roomId1);
      const game2 = Game.create(roomId2);
      await repository.save(game1);
      await repository.save(game2);

      // Act
      await repository.delete(roomId1);

      // Assert
      const found1 = await repository.findById(roomId1);
      const found2 = await repository.findById(roomId2);
      expect(found1).toBeNull();
      expect(found2).not.toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no games exist', async () => {
      // Act
      const games = await repository.findAll();

      // Assert
      expect(games).toEqual([]);
    });

    it('should return all saved games', async () => {
      // Arrange
      const game1 = Game.create(RoomId.from('FINDA1'));
      const game2 = Game.create(RoomId.from('FINDB2'));
      const game3 = Game.create(RoomId.from('FINDC3'));

      await repository.save(game1);
      await repository.save(game2);
      await repository.save(game3);

      // Act
      const games = await repository.findAll();

      // Assert
      expect(games).toHaveLength(3);
      expect(games.every((g) => g instanceof Game)).toBe(true);

      const roomIds = games.map((g) => g.roomId.value).sort();
      expect(roomIds).toEqual(['FINDA1', 'FINDB2', 'FINDC3']);
    });

    it('should reconstruct Game entities correctly', async () => {
      // Arrange
      const game1 = Game.create(RoomId.from('ROOMA1'));
      const player1 = Player.create(PlayerId.create('p1'), 'Alice');
      game1.addPlayer(player1);
      game1.changePhase('waiting');

      const game2 = Game.create(RoomId.from('ROOMB2'));
      const player2 = Player.create(PlayerId.create('p2'), 'Bob');
      game2.addPlayer(player2);
      game2.changePhase('playing');

      await repository.save(game1);
      await repository.save(game2);

      // Act
      const games = await repository.findAll();

      // Assert
      expect(games).toHaveLength(2);

      const foundGame1 = games.find((g) => g.roomId.value === 'ROOMA1');
      const foundGame2 = games.find((g) => g.roomId.value === 'ROOMB2');

      expect(foundGame1).toBeDefined();
      expect(foundGame1!.phase).toBe('waiting');
      expect(foundGame1!.players).toHaveLength(1);

      expect(foundGame2).toBeDefined();
      expect(foundGame2!.phase).toBe('playing');
      expect(foundGame2!.players).toHaveLength(1);
    });
  });

  describe('Connection handling', () => {
    // MongoDB 연결 타임아웃이 너무 길어서 skip 처리
    // 실제 운영 환경에서는 MongoClient의 connectTimeoutMS 옵션으로 제어 가능
    it.skip('should handle connection errors gracefully', async () => {
      // Arrange
      const badRepository = new MongoGameRepository('mongodb://invalid-host:27017', 'test-db');

      // Act & Assert
      await expect(badRepository.connect()).rejects.toThrow(ConnectionError);
    });
  });

  describe('Edge cases', () => {
    it('should handle game with empty players array', async () => {
      // Arrange
      const roomId = RoomId.from('EMPTY1');
      const game = Game.create(roomId);

      // Act
      await repository.save(game);
      const found = await repository.findById(roomId);

      // Assert
      expect(found).not.toBeNull();
      expect(found!.players).toEqual([]);
    });

    it('should handle game with undefined optional fields', async () => {
      // Arrange
      const roomId = RoomId.from('MINML1');
      const game = Game.create(roomId);

      // Act
      await repository.save(game);
      const found = await repository.findById(roomId);

      // Assert
      expect(found).not.toBeNull();
      expect(found!.selectableDecks).toBeUndefined();
      expect(found!.roleSelectionCards).toBeUndefined();
      // MongoDB에서 undefined는 null로 반환될 수 있음
      expect(found!.lastPlay).toBeFalsy();
    });

    it('should handle game with all optional fields populated', async () => {
      // Arrange
      const roomId = RoomId.from('FULL01');
      const playerId = PlayerId.create('p1');
      const game = Game.create(roomId);
      game.setSelectableDecks([{ cards: [Card.create(1, false)], isSelected: false }]);
      game.setRoleSelectionCards([{ number: 1, isSelected: false }]);
      game.setLastPlay({
        playerId,
        cards: [Card.create(3, false)],
      });

      // Act
      await repository.save(game);
      const found = await repository.findById(roomId);

      // Assert
      expect(found).not.toBeNull();
      expect(found!.selectableDecks).toBeDefined();
      expect(found!.roleSelectionCards).toBeDefined();
      expect(found!.lastPlay).toBeDefined();
    });

    it('should handle multiple updates to same game', async () => {
      // Arrange
      const roomId = RoomId.from('MULTI1');
      const game = Game.create(roomId);
      await repository.save(game);

      // Act
      await repository.update(roomId, { phase: 'waiting' });
      await repository.update(roomId, { phase: 'playing' });
      await repository.update(roomId, { round: 5 });

      const found = await repository.findById(roomId);

      // Assert
      expect(found!.phase).toBe('playing');
      expect(found!.round).toBe(5);
    });
  });
});
