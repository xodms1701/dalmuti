/**
 * JoinGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { JoinGameUseCase } from '../../../../../src/application/use-cases/game/JoinGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { JoinGameRequest } from '../../../../../src/application/dto/game/JoinGameDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';
import { Player } from '../../../../../src/domain/entities/Player';

describe('JoinGameUseCase', () => {
  let useCase: JoinGameUseCase;
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

    useCase = new JoinGameUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should join game successfully', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player123',
        nickname: 'TestPlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player123');
        expect(response.data.playerCount).toBe(1);
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(roomId);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should add player to existing game with players', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM02');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      const existingPlayer = Player.create(PlayerId.create('existing1'), 'ExistingPlayer');
      game.addPlayer(existingPlayer);

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'ROOM02',
        playerId: 'newplayer',
        nickname: 'NewPlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.playerCount).toBe(2);
      }
    });

    it('should call repository.update with updated game', async () => {
      // Arrange
      const roomId = RoomId.from('TEST01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'TEST01',
        playerId: 'player456',
        nickname: 'UpdateTest',
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'TEST01' }),
        expect.objectContaining({
          roomId: expect.objectContaining({ value: 'TEST01' }),
        })
      );
      const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
      expect(updatedGame.players.length).toBe(1);
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: JoinGameRequest = {
        roomId: 'ROOM99',
        playerId: 'player123',
        nickname: 'TestPlayer',
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

    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: JoinGameRequest = {
        roomId: 'INVALID',
        playerId: 'player123',
        nickname: 'TestPlayer',
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
    });

    it('should return error when roomId is too long', async () => {
      // Arrange
      const request: JoinGameRequest = {
        roomId: 'TOOLONG123',
        playerId: 'player123',
        nickname: 'TestPlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when roomId contains invalid characters', async () => {
      // Arrange
      const request: JoinGameRequest = {
        roomId: 'ROOM#1',
        playerId: 'player123',
        nickname: 'TestPlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error when nickname is empty', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player123',
        nickname: '',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('nickname');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when player already exists in game', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      const existingPlayer = Player.create(PlayerId.create('player123'), 'ExistingPlayer');
      game.addPlayer(existingPlayer);

      mockRepository.findById.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player123', // 동일한 playerId
        nickname: 'DuplicatePlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('ADD_PLAYER_FAILED');
        expect(response.error.message).toContain('already exists');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when repository update fails', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: JoinGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player123',
        nickname: 'TestPlayer',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('JOIN_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player123',
        nickname: 'TestPlayer',
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
      const roomId = RoomId.from('RESP01');
      const game = Game.create(roomId, PlayerId.create('owner1'));
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      const request: JoinGameRequest = {
        roomId: 'RESP01',
        playerId: 'player123',
        nickname: 'ResponseTest',
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
        expect(response.data).toHaveProperty('playerCount');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: JoinGameRequest = {
        roomId: 'BAD',
        playerId: 'player123',
        nickname: 'ErrorTest',
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
