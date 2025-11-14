/**
 * VoteNextGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { VoteNextGameUseCase } from '../../../../../src/application/use-cases/game/VoteNextGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { VoteNextGameRequest } from '../../../../../src/application/dto/game/VoteNextGameDto';
import { NotFoundError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('VoteNextGameUseCase', () => {
  let useCase: VoteNextGameUseCase;
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

    useCase = new VoteNextGameUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should record vote approval successfully', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const playerId1 = PlayerId.create('player1');
      const playerId2 = PlayerId.create('player2');

      const player1 = Player.create(playerId1, 'Player 1');
      const player2 = Player.create(playerId2, 'Player 2');

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        vote: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.votePassed).toBe(false); // 아직 모든 플레이어가 투표하지 않음
        expect(response.data.nextGameStarted).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should start next game when all players vote yes', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM02');
      const playerId1 = PlayerId.create('player1');
      const playerId2 = PlayerId.create('player2');
      const playerId3 = PlayerId.create('player3');

      const player1 = Player.create(playerId1, 'Player 1');
      const player2 = Player.create(playerId2, 'Player 2');
      const player3 = Player.create(playerId3, 'Player 3');

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);

      // 첫 두 플레이어는 이미 찬성 투표
      game.registerVote(playerId1, true);
      game.registerVote(playerId2, true);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM02',
        playerId: 'player3',
        vote: true, // 마지막 플레이어가 찬성
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.votePassed).toBe(true);
        expect(response.data.nextGameStarted).toBe(true);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      // 게임 상태 확인
      const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
      expect(updatedGame.phase).toBe('roleSelection');
      expect(updatedGame.round).toBeGreaterThan(0);
    });

    it('should end game when at least one player votes no', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM03');
      const playerId1 = PlayerId.create('player1');
      const playerId2 = PlayerId.create('player2');

      const player1 = Player.create(playerId1, 'Player 1');
      const player2 = Player.create(playerId2, 'Player 2');

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);

      // 첫 플레이어는 찬성
      game.registerVote(playerId1, true);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM03',
        playerId: 'player2',
        vote: false, // 반대 투표
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.votePassed).toBe(false);
        expect(response.data.nextGameStarted).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      // 게임 상태 확인
      const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
      expect(updatedGame.phase).toBe('gameEnd');
    });

    it('should handle all players voting yes in sequence', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM04');
      const playerId1 = PlayerId.create('player1');
      const playerId2 = PlayerId.create('player2');

      const player1 = Player.create(playerId1, 'Player 1');
      const player2 = Player.create(playerId2, 'Player 2');

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);

      mockRepository.findById.mockResolvedValue(game);

      // 첫 번째 플레이어 투표
      const request1: VoteNextGameRequest = {
        roomId: 'ROOM04',
        playerId: 'player1',
        vote: true,
      };

      const response1 = await useCase.execute(request1);
      expect(response1.success).toBe(true);
      if (response1.success) {
        expect(response1.data.nextGameStarted).toBe(false); // 아직 모든 플레이어가 투표하지 않음
      }

      // 두 번째 플레이어 투표 (모든 플레이어 투표 완료)
      const request2: VoteNextGameRequest = {
        roomId: 'ROOM04',
        playerId: 'player2',
        vote: true,
      };

      const response2 = await useCase.execute(request2);
      expect(response2.success).toBe(true);
      if (response2.success) {
        expect(response2.data.votePassed).toBe(true);
        expect(response2.data.nextGameStarted).toBe(true);
      }
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: VoteNextGameRequest = {
        roomId: 'NOTF01',
        playerId: 'player1',
        vote: true,
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
      const roomId = RoomId.from('ROOM05');
      const playerId1 = PlayerId.create('player1');
      const player1 = Player.create(playerId1, 'Player 1');

      const game = Game.create(roomId);
      game.addPlayer(player1);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM05',
        playerId: 'nonexistent',
        vote: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('Player not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when roomId format is invalid', async () => {
      // Arrange - RoomId는 6자리 영숫자여야 함
      const request: VoteNextGameRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
        vote: true,
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

    it('should return error when repository fails', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM06');
      const playerId1 = PlayerId.create('player1');
      const player1 = Player.create(playerId1, 'Player 1');

      const game = Game.create(roomId);
      game.addPlayer(player1);

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: VoteNextGameRequest = {
        roomId: 'ROOM06',
        playerId: 'player1',
        vote: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VOTE_NEXT_GAME_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM07');
      const playerId1 = PlayerId.create('player1');
      const player1 = Player.create(playerId1, 'Player 1');

      const game = Game.create(roomId);
      game.addPlayer(player1);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM07',
        playerId: 'player1',
        vote: true,
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
      const roomId = RoomId.from('ROOM08');
      const playerId1 = PlayerId.create('player1');
      const player1 = Player.create(playerId1, 'Player 1');

      const game = Game.create(roomId);
      game.addPlayer(player1);

      mockRepository.findById.mockResolvedValue(game);

      const request: VoteNextGameRequest = {
        roomId: 'ROOM08',
        playerId: 'player1',
        vote: true,
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
        expect(response.data).toHaveProperty('votePassed');
        expect(response.data).toHaveProperty('nextGameStarted');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: VoteNextGameRequest = {
        roomId: 'BAD',
        playerId: 'player1',
        vote: true,
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
