/**
 * TransitionTaxToPlayingUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { TransitionTaxToPlayingUseCase } from '../../../../../src/application/use-cases/game/TransitionTaxToPlayingUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { TransitionTaxToPlayingRequest } from '../../../../../src/application/dto/game/TransitionTaxToPlayingDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('TransitionTaxToPlayingUseCase', () => {
  let useCase: TransitionTaxToPlayingUseCase;
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

    useCase = new TransitionTaxToPlayingUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should transition from tax to playing phase successfully', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 게임을 tax 페이즈로 설정
      game.changePhase('tax');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM01',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.phase).toBe('playing');
        expect(response.data.transitioned).toBe(true);
      }

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(roomId, game);
      expect(game.phase).toBe('playing');
    });

    it('should not transition if phase is not tax', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM02');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 게임을 playing 페이즈로 설정 (tax가 아님)
      game.changePhase('roleSelection');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM02',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM02');
        expect(response.data.phase).toBe('roleSelection');
        expect(response.data.transitioned).toBe(false);
      }

      // phase가 tax가 아니므로 update 호출되지 않아야 함
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should handle roleSelectionComplete phase without transitioning', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM03');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM03',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.transitioned).toBe(false);
        expect(response.data.phase).toBe('roleSelectionComplete');
      }

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('에러 케이스', () => {
    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: TransitionTaxToPlayingRequest = {
        roomId: 'INVALID',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('6');
        expect(response.error.details).toEqual({ field: 'roomId' });
      }

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'NOTF01',
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

    it('should return error when repository update fails', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM04');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.changePhase('tax');

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM04',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('TRANSITION_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM05');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.changePhase('tax');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM05',
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
      const roomId = RoomId.from('ROOM06');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.changePhase('tax');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionTaxToPlayingRequest = {
        roomId: 'ROOM06',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('roomId');
        expect(response.data).toHaveProperty('phase');
        expect(response.data).toHaveProperty('transitioned');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: TransitionTaxToPlayingRequest = {
        roomId: 'BAD',
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
