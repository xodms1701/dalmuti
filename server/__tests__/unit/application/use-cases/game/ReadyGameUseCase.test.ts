/**
 * ReadyGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { ReadyGameUseCase } from '../../../../../src/application/use-cases/game/ReadyGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { ReadyGameRequest } from '../../../../../src/application/dto/game/ReadyGameDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('ReadyGameUseCase', () => {
  let useCase: ReadyGameUseCase;
  let mockRepository: jest.Mocked<IGameRepository>;

  beforeEach(() => {
    // Repository Mock 생성
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };

    useCase = new ReadyGameUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should set player ready status to true', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.isReady).toBe(true);
        expect(response.data.allPlayersReady).toBe(true);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(player.isReady).toBe(true);
    });

    it('should set player ready status to false (unready)', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      player.ready(); // 먼저 준비 상태로 설정
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: false,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.isReady).toBe(false);
        expect(response.data.allPlayersReady).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(player.isReady).toBe(false);
    });

    it('should return true for allPlayersReady when all players are ready', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');
      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');
      player2.ready(); // player2는 이미 준비 완료

      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player1);
      game.addPlayer(player2);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.allPlayersReady).toBe(true);
      }
    });

    it('should return false for allPlayersReady when not all players are ready', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');
      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');

      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player1);
      game.addPlayer(player2);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.allPlayersReady).toBe(false);
      }
    });

    it('should call repository.update with roomId and updated game', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ _value: 'ROOM01' }),
        game
      );
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: ReadyGameRequest = {
        roomId: 'ROOM99',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(response.error.message).toContain('Game not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when player not found', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      // 플레이어를 추가하지 않음

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(response.error.message).toContain('Player not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when roomId format is invalid', async () => {
      // Arrange
      const request: ReadyGameRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('6');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when playerId is empty', async () => {
      // Arrange
      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: '',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when repository update fails', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('READY_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      const beforeTime = new Date();

      // Act
      const response = await useCase.execute(request);

      // Assert
      const afterTime = new Date();
      expect(response.timestamp).toBeInstanceOf(Date);
      expect(response.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(response.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should include all required fields in success response', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId = PlayerId.create('player1');
      const player = Player.create(playerId, 'Player 1');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      game.addPlayer(player);

      mockRepository.findById.mockResolvedValue(game);

      const request: ReadyGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('roomId');
        expect(response.data).toHaveProperty('playerId');
        expect(response.data).toHaveProperty('isReady');
        expect(response.data).toHaveProperty('allPlayersReady');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: ReadyGameRequest = {
        roomId: 'BAD',
        playerId: 'player1',
        isReady: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (!response.success) {
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
      }
    });
  });
});
