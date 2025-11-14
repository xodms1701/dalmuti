/**
 * LeaveGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { LeaveGameUseCase } from '../../../../../src/application/use-cases/game/LeaveGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { LeaveGameRequest } from '../../../../../src/application/dto/game/LeaveGameDto';
import { NotFoundError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('LeaveGameUseCase', () => {
  let useCase: LeaveGameUseCase;
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

    useCase = new LeaveGameUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should successfully remove player from game', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
      };

      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Player 2'));

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.remainingPlayers).toBe(1);
        expect(response.data.gameDeleted).toBe(false);
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'ROOM01' })
      );
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete game when last player leaves', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'ROOM02',
        playerId: 'player1',
      };

      const game = Game.create(RoomId.from('ROOM02'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.delete.mockResolvedValue();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM02');
        expect(response.data.remainingPlayers).toBe(0);
        expect(response.data.gameDeleted).toBe(true);
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'ROOM02' })
      );
      expect(mockRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'ROOM02' })
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should call repository.update with updated Game entity', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'TEST01',
        playerId: 'player1',
      };

      const game = Game.create(RoomId.from('TEST01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Player 2'));
      game.addPlayer(Player.create(PlayerId.create('player3'), 'Player 3'));

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'TEST01' }),
        expect.objectContaining({
          roomId: expect.objectContaining({ value: 'TEST01' }),
        })
      );
      // 업데이트된 게임의 플레이어 수 확인
      const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
      expect(updatedGame.players.length).toBe(2);
    });
  });

  describe('에러 케이스', () => {
    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: LeaveGameRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
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

    it('should return error when playerId is empty', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: '',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('empty');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      const request: LeaveGameRequest = {
        roomId: 'ROOM99',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(response.error.message).toContain('not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should return error when player not found in game', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: 'nonexistent',
      };

      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));

      mockRepository.findById.mockResolvedValue(game);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('PLAYER_REMOVAL_FAILED');
        expect(response.error.message).toContain('not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when repository update fails', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(
        (() => {
          const game = Game.create(RoomId.from('ROOM01'));
          game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
          game.addPlayer(Player.create(PlayerId.create('player2'), 'Player 2'));
          return game;
        })()
      );
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('LEAVE_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });

    it('should return error when repository delete fails', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(
        (() => {
          const game = Game.create(RoomId.from('ROOM01'));
          game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
          return game;
        })()
      );
      mockRepository.delete.mockRejectedValue(new Error('Database connection failed'));

      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('LEAVE_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
      };

      const game = Game.create(RoomId.from('ROOM01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Player 2'));

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

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
      const request: LeaveGameRequest = {
        roomId: 'RESP01',
        playerId: 'player1',
      };

      const game = Game.create(RoomId.from('RESP01'));
      game.addPlayer(Player.create(PlayerId.create('player1'), 'Player 1'));
      game.addPlayer(Player.create(PlayerId.create('player2'), 'Player 2'));

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockResolvedValue(game);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('roomId');
        expect(response.data).toHaveProperty('remainingPlayers');
        expect(response.data).toHaveProperty('gameDeleted');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: LeaveGameRequest = {
        roomId: 'BAD',
        playerId: 'player1',
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
