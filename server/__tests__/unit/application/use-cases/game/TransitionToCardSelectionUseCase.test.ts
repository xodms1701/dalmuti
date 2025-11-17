/**
 * TransitionToCardSelectionUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { TransitionToCardSelectionUseCase } from '../../../../../src/application/use-cases/game/TransitionToCardSelectionUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { TransitionToCardSelectionRequest } from '../../../../../src/application/dto/game/TransitionToCardSelectionDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('TransitionToCardSelectionUseCase', () => {
  let useCase: TransitionToCardSelectionUseCase;
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

    useCase = new TransitionToCardSelectionUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should transition from roleSelectionComplete to cardSelection successfully', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 4명의 플레이어 추가 (owner 포함)
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');
      const player3Id = PlayerId.create('player3');

      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));
      game.addPlayer(Player.create(player2Id, 'Player2'));
      game.addPlayer(Player.create(player3Id, 'Player3'));

      // 플레이어들의 rank 설정 (owner가 rank 1)
      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      const p2 = game.getPlayer(player2Id);
      const p3 = game.getPlayer(player3Id);

      if (owner && p1 && p2 && p3) {
        owner.assignRank(1);
        p1.assignRank(2);
        p2.assignRank(3);
        p3.assignRank(4);
      }

      // 게임을 roleSelectionComplete 페이즈로 설정
      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM01',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.phase).toBe('cardSelection');
        expect(response.data.transitioned).toBe(true);
        expect(response.data.currentTurn).toBe(ownerId.value); // rank 1 플레이어
      }

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(roomId, game);
      expect(game.phase).toBe('cardSelection');
      expect(game.currentTurn?.value).toBe(ownerId.value);
      expect(game.selectableDecks).toBeDefined();
      expect(game.selectableDecks?.length).toBe(4); // 4명의 플레이어이므로 4개 덱
    });

    it('should not transition if phase is not roleSelectionComplete', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM02');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 게임을 playing 페이즈로 설정 (roleSelectionComplete가 아님)
      game.changePhase('playing');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM02',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM02');
        expect(response.data.phase).toBe('playing');
        expect(response.data.transitioned).toBe(false);
      }

      // phase가 roleSelectionComplete가 아니므로 update 호출되지 않아야 함
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should handle waiting phase without transitioning', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM03');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.changePhase('waiting');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM03',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.transitioned).toBe(false);
        expect(response.data.phase).toBe('waiting');
      }

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should set currentTurn to rank 1 player correctly', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM04');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 5명의 플레이어 추가 (owner 포함)
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');
      const player3Id = PlayerId.create('player3');
      const player4Id = PlayerId.create('player4');

      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));
      game.addPlayer(Player.create(player2Id, 'Player2'));
      game.addPlayer(Player.create(player3Id, 'Player3'));
      game.addPlayer(Player.create(player4Id, 'Player4'));

      // 플레이어들의 rank 설정 (player2가 rank 1)
      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      const p2 = game.getPlayer(player2Id);
      const p3 = game.getPlayer(player3Id);
      const p4 = game.getPlayer(player4Id);

      if (owner && p1 && p2 && p3 && p4) {
        owner.assignRank(5);
        p1.assignRank(3);
        p2.assignRank(1); // 최고 순위
        p3.assignRank(4);
        p4.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM04',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.currentTurn).toBe(player2Id.value); // rank 1 플레이어
      }

      expect(game.currentTurn?.value).toBe(player2Id.value);
    });
  });

  describe('에러 케이스', () => {
    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: TransitionToCardSelectionRequest = {
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

      const request: TransitionToCardSelectionRequest = {
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
      const roomId = RoomId.from('ROOM05');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      // 플레이어 추가 및 rank 설정 (owner 포함)
      const player1Id = PlayerId.create('player1');
      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));

      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      if (owner && p1) {
        owner.assignRank(1);
        p1.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM05',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('UPDATE_GAME_FAILED');
        expect(response.error.message).toContain('Failed to update game state');
      }
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Unexpected database error'));

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM06',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('TRANSITION_TO_CARD_SELECTION_FAILED');
        expect(response.error.message).toContain('Unexpected database error');
      }
    });
  });

  describe('환경 변수 테스트', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // 환경 변수 초기화
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // 환경 변수 복원
      process.env = originalEnv;
    });

    it('should apply test backdoor when ENABLE_TEST_BACKDOOR is true', async () => {
      // Arrange
      process.env.ENABLE_TEST_BACKDOOR = 'true';

      const roomId = RoomId.from('ROOM07');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      game.addPlayer(Player.create(ownerId, 'Owner'));
      const player1Id = PlayerId.create('player1');
      game.addPlayer(Player.create(player1Id, 'Player1'));

      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      if (owner && p1) {
        owner.assignRank(1);
        p1.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM07',
      };

      // console.log spy 설정
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TEST BACKDOOR] Moving 2 jokers to first deck positions'
      );

      consoleLogSpy.mockRestore();
    });

    it('should apply test backdoor when NODE_ENV is development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      const roomId = RoomId.from('ROOM08');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      const player1Id = PlayerId.create('player1');
      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));

      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      if (owner && p1) {
        owner.assignRank(1);
        p1.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM08',
      };

      // console.log spy 설정
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TEST BACKDOOR] Moving 2 jokers to first deck positions'
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM09');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      const player1Id = PlayerId.create('player1');
      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));

      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      if (owner && p1) {
        owner.assignRank(1);
        p1.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM09',
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
      const roomId = RoomId.from('ROOM10');
      const ownerId = PlayerId.create('owner1');
      const game = Game.create(roomId, ownerId);

      const player1Id = PlayerId.create('player1');
      game.addPlayer(Player.create(ownerId, 'Owner'));
      game.addPlayer(Player.create(player1Id, 'Player1'));

      const owner = game.getPlayer(ownerId);
      const p1 = game.getPlayer(player1Id);
      if (owner && p1) {
        owner.assignRank(1);
        p1.assignRank(2);
      }

      game.changePhase('roleSelectionComplete');

      mockRepository.findById.mockResolvedValue(game);

      const request: TransitionToCardSelectionRequest = {
        roomId: 'ROOM10',
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
        expect(response.data).toHaveProperty('currentTurn');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: TransitionToCardSelectionRequest = {
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
