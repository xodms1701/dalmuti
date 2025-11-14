/**
 * PlayCardUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { PlayCardUseCase } from '../../../../../src/application/use-cases/game/PlayCardUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { PlayCardRequest } from '../../../../../src/application/dto/game/PlayCardDto';
import { NotFoundError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { Card } from '../../../../../src/domain/entities/Card';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('PlayCardUseCase', () => {
  let useCase: PlayCardUseCase;
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

    useCase = new PlayCardUseCase(mockRepository);
  });

  /**
   * 테스트용 게임 생성 헬퍼
   */
  function createTestGame(): Game {
    const game = Game.create(RoomId.from('ROOM01'));

    // 플레이어 3명 추가
    const player1 = Player.create(PlayerId.create('player1'), 'Player 1');
    const player2 = Player.create(PlayerId.create('player2'), 'Player 2');
    const player3 = Player.create(PlayerId.create('player3'), 'Player 3');

    // 플레이어에게 카드 할당
    player1.assignCards([
      Card.create(3, false),
      Card.create(3, false),
      Card.create(5, false),
    ]);
    player2.assignCards([
      Card.create(4, false),
      Card.create(4, false),
      Card.create(6, false),
    ]);
    player3.assignCards([
      Card.create(7, false),
      Card.create(8, false),
    ]);

    // 플레이어에게 순위 할당
    player1.assignRank(1);
    player2.assignRank(2);
    player3.assignRank(3);

    game.addPlayer(player1);
    game.addPlayer(player2);
    game.addPlayer(player3);

    // 게임 페이즈를 playing으로 변경
    game.changePhase('playing');

    // 현재 턴을 player1로 설정
    game.setCurrentTurn(PlayerId.create('player1'));

    return game;
  }

  describe('성공 케이스', () => {
    it('should play cards successfully', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [
          { rank: 3, isJoker: false },
          { rank: 3, isJoker: false },
        ],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.playedCards).toHaveLength(2);
        expect(response.data.playedCards[0].rank).toBe(3);
        expect(response.data.nextTurn).toBe('player2');
        expect(response.data.roundFinished).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should calculate next turn correctly', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.nextTurn).toBe('player2');
      }
    });

    it('should mark player as finished when all cards are played', async () => {
      // Arrange
      const game = createTestGame();

      // player1의 카드를 모두 같은 숫자로 변경 (3장 모두 3)
      const player1 = game.getPlayer(PlayerId.create('player1'));
      if (player1) {
        player1.assignCards([
          Card.create(3, false),
          Card.create(3, false),
          Card.create(3, false),
        ]);
      }

      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [
          { rank: 3, isJoker: false },
          { rank: 3, isJoker: false },
          { rank: 3, isJoker: false },
        ],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
        expect(updatedGame.finishedPlayers).toContainEqual(PlayerId.create('player1'));
      }
    });

    it('should update lastPlay correctly', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      const updatedGame = mockRepository.update.mock.calls[0][1] as Game;
      expect(updatedGame.lastPlay).toBeDefined();
      expect(updatedGame.lastPlay?.playerId.value).toBe('player1');
      expect(updatedGame.lastPlay?.cards).toHaveLength(1);
      expect(updatedGame.lastPlay?.cards[0].rank).toBe(3);
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
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
      // Arrange
      const request: PlayCardRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
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

    it('should return error when player does not have cards', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [
          { rank: 10, isJoker: false }, // player1은 10을 가지고 있지 않음
        ],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('PLAYER_DOES_NOT_HAVE_CARDS');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when cards violate game rules', async () => {
      // Arrange
      const game = createTestGame();

      // lastPlay 설정: player2가 4를 두 장 냄
      game.setLastPlay({
        playerId: PlayerId.create('player2'),
        cards: [
          Card.create(4, false),
          Card.create(4, false),
        ],
      });

      // player1의 턴으로 설정
      game.setCurrentTurn(PlayerId.create('player1'));

      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [
          { rank: 5, isJoker: false }, // 5는 4보다 약함 (숫자가 클수록 약함)
        ],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('INVALID_CARDS');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when not player turn', async () => {
      // Arrange
      const game = createTestGame();
      // player1의 턴이지만 player2가 카드를 내려고 함
      game.setCurrentTurn(PlayerId.create('player1'));

      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player2',
        cards: [{ rank: 4, isJoker: false }],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('INVALID_PLAYER_ACTION');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when game is not in playing phase', async () => {
      // Arrange
      const game = createTestGame();
      game.changePhase('waiting'); // playing이 아닌 상태

      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('INVALID_GAME_STATE');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when card rank is invalid', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 15, isJoker: false }], // rank는 1-13 사이여야 함
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when repository update fails', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('PLAY_CARD_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);
      const beforeTime = new Date();

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
      };

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
      const game = createTestGame();
      mockRepository.findById.mockResolvedValue(game);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
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
        expect(response.data).toHaveProperty('playedCards');
        expect(response.data).toHaveProperty('nextTurn');
        expect(response.data).toHaveProperty('roundFinished');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: PlayCardRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        cards: [{ rank: 3, isJoker: false }],
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
