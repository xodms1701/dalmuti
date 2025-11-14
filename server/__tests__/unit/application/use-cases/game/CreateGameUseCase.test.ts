/**
 * CreateGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { CreateGameUseCase } from '../../../../../src/application/use-cases/game/CreateGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { CreateGameRequest } from '../../../../../src/application/dto/game/CreateGameDto';
import { DuplicateError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';

describe('CreateGameUseCase', () => {
  let useCase: CreateGameUseCase;
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

    useCase = new CreateGameUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should create game with auto-generated roomId', async () => {
      // Arrange
      const request: CreateGameRequest = {};

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toHaveLength(6);
        expect(response.data.phase).toBe('waiting');
        expect(response.data.createdAt).toBeInstanceOf(Date);
      }
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create game with specified roomId', async () => {
      // Arrange
      const request: CreateGameRequest = { roomId: 'ROOM01' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.phase).toBe('waiting');
      }
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should call repository.save with Game entity', async () => {
      // Arrange
      const request: CreateGameRequest = { roomId: 'TEST01' };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: expect.objectContaining({ value: 'TEST01' }),
          phase: 'waiting',
        })
      );
    });
  });

  describe('에러 케이스', () => {
    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: CreateGameRequest = { roomId: 'INVALID' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('6');
      }
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when roomId is too long', async () => {
      // Arrange
      const request: CreateGameRequest = { roomId: 'TOOLONG123' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when roomId contains invalid characters', async () => {
      // Arrange
      const request: CreateGameRequest = { roomId: 'ROOM#1' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return conflict error when roomId already exists', async () => {
      // Arrange
      mockRepository.save.mockRejectedValue(new DuplicateError('Game', 'ROOM01'));
      const request: CreateGameRequest = { roomId: 'ROOM01' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('CONFLICT');
        expect(response.error.message).toContain('already exists');
      }
    });

    it('should return error when repository fails', async () => {
      // Arrange
      mockRepository.save.mockRejectedValue(new Error('Database connection failed'));
      const request: CreateGameRequest = {};

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('CREATE_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const request: CreateGameRequest = {};
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
      const request: CreateGameRequest = { roomId: 'RESP01' };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('roomId');
        expect(response.data).toHaveProperty('phase');
        expect(response.data).toHaveProperty('createdAt');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: CreateGameRequest = { roomId: 'BAD' };

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
