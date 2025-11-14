/**
 * SelectDeckUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { SelectDeckUseCase } from '../../../../../src/application/use-cases/game/SelectDeckUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { SelectDeckRequest } from '../../../../../src/application/dto/game/SelectDeckDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { Card } from '../../../../../src/domain/entities/Card';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('SelectDeckUseCase', () => {
  let useCase: SelectDeckUseCase;
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

    useCase = new SelectDeckUseCase(mockRepository);
  });

  /**
   * 테스트용 게임 생성 헬퍼
   */
  const createTestGame = (roomId: string = 'ROOM01'): Game => {
    const game = Game.create(RoomId.from(roomId));

    // 플레이어 추가
    const player1 = Player.create(PlayerId.create('player1'), 'Player 1');
    const player2 = Player.create(PlayerId.create('player2'), 'Player 2');
    player1.assignRole(1);
    player1.assignRank(1);
    player2.assignRole(2);
    player2.assignRank(2);

    game.addPlayer(player1);
    game.addPlayer(player2);

    // cardSelection 페이즈로 설정
    game.changePhase('cardSelection');
    game.setCurrentTurn(PlayerId.create('player1'));

    // 선택 가능한 덱 설정
    const selectableDecks = [
      {
        cards: [Card.create(1, false), Card.create(2, false)],
        isSelected: false,
        selectedBy: undefined,
      },
      {
        cards: [Card.create(3, false), Card.create(4, false)],
        isSelected: false,
        selectedBy: undefined,
      },
    ];
    game.setSelectableDecks(selectableDecks);

    return game;
  };

  describe('성공 케이스', () => {
    it('should successfully select a deck', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.selectedCards).toHaveLength(2);
        expect(response.data.selectedCards[0]).toEqual({ rank: 1, isJoker: false });
        expect(response.data.selectedCards[1]).toEqual({ rank: 2, isJoker: false });
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ _value: 'ROOM01' }),
        expect.any(Game)
      );
    });

    it('should select second deck successfully', async () => {
      // Arrange
      const game = createTestGame('ROOM02');
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM02',
        playerId: 'player1',
        deckIndex: 1,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.selectedCards).toHaveLength(2);
        expect(response.data.selectedCards[0]).toEqual({ rank: 3, isJoker: false });
        expect(response.data.selectedCards[1]).toEqual({ rank: 4, isJoker: false });
      }
    });
  });

  describe('에러 케이스 - 게임 없음', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: SelectDeckRequest = {
        roomId: 'ROOM99',
        playerId: 'player1',
        deckIndex: 0,
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
  });

  describe('에러 케이스 - 잘못된 입력값', () => {
    it('should return error when roomId format is invalid', async () => {
      // Arrange
      const request: SelectDeckRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
        deckIndex: 0,
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

    it('should return error when deckIndex is negative', async () => {
      // Arrange
      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: -1,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('non-negative');
      }
    });
  });

  describe('에러 케이스 - 도메인 규칙 위반', () => {
    it('should return error when deck index is out of range', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: 999,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('Invalid deck index');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when deck already selected', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      // 덱을 미리 선택된 상태로 만듦
      const decks = game.selectableDecks;
      if (decks) {
        decks[0].isSelected = true;
        decks[0].selectedBy = 'player2';
      }
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('already selected');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when not player turn', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      // player2의 턴으로 설정
      game.setCurrentTurn(PlayerId.create('player2'));
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1', // player1이 시도
        deckIndex: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('Not player turn');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when game is not in cardSelection phase', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      game.changePhase('playing'); // 다른 페이즈로 변경
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('cardSelection');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const game = createTestGame('ROOM01');
      mockRepository.findById.mockResolvedValue(game);
      const beforeTime = new Date();

      const request: SelectDeckRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        deckIndex: 0,
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
      const game = createTestGame('RESP01');
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectDeckRequest = {
        roomId: 'RESP01',
        playerId: 'player1',
        deckIndex: 0,
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
        expect(response.data).toHaveProperty('selectedCards');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: SelectDeckRequest = {
        roomId: 'BAD',
        playerId: 'player1',
        deckIndex: 0,
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
