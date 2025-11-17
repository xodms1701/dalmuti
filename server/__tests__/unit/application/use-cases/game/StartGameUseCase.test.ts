/**
 * StartGameUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { StartGameUseCase } from '../../../../../src/application/use-cases/game/StartGameUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { StartGameRequest } from '../../../../../src/application/dto/game/StartGameDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('StartGameUseCase', () => {
  let useCase: StartGameUseCase;
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

    useCase = new StartGameUseCase(mockRepository);
  });

  // 테스트용 게임 생성 헬퍼
  const createTestGame = (roomId: string, playerCount: number = 4): Game => {
    const game = Game.create(RoomId.from(roomId), PlayerId.create('owner1'));

    // 플레이어 추가
    for (let i = 1; i <= playerCount; i++) {
      const player = Player.create(PlayerId.create(`player${i}`), `Player${i}`);
      game.addPlayer(player);
      player.ready(); // 모든 플레이어 준비 완료
    }

    return game;
  };

  describe('성공 케이스', () => {
    it('4명 플레이어로 게임을 시작해야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM01', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM01',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.phase).toBe('roleSelection');
        expect(response.data.playerCount).toBe(4);
      }

      // Repository update 호출 확인
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      // 게임 상태 확인
      expect(game.phase).toBe('roleSelection');
      expect(game.deck).toBeDefined();
      expect(game.deck?.length).toBe(54); // 표준 덱: 52장 + 조커 2장
      expect(game.roleSelectionCards).toBeDefined();
      expect(game.roleSelectionCards?.length).toBe(13); // 1-13 역할 카드
    });

    it('8명 플레이어로 게임을 시작해야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM02', 8);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM02',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM02');
        expect(response.data.phase).toBe('roleSelection');
        expect(response.data.playerCount).toBe(8);
      }

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(game.phase).toBe('roleSelection');
    });

    it('덱이 올바르게 초기화되어야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM03', 5);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM03',
      };

      // Act
      await useCase.execute(request);

      // Assert
      // 덱이 설정되었는지 확인
      expect(game.deck).toBeDefined();
      expect(game.deck?.length).toBe(54);

      // 조커 2장 확인
      const jokers = game.deck?.filter((card) => card.isJoker);
      expect(jokers?.length).toBe(2);

      // rank 1-13 카드 각 4장씩 확인
      for (let rank = 1; rank <= 13; rank++) {
        const cardsOfRank = game.deck?.filter((card) => card.rank === rank && !card.isJoker);
        expect(cardsOfRank?.length).toBe(4);
      }
    });

    it('역할 선택 카드가 올바르게 초기화되어야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM04', 6);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM04',
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(game.roleSelectionCards).toBeDefined();
      expect(game.roleSelectionCards?.length).toBe(13);

      // 1-13 숫자 카드 확인
      for (let i = 1; i <= 13; i++) {
        const card = game.roleSelectionCards?.find((c) => c.number === i);
        expect(card).toBeDefined();
        expect(card?.isSelected).toBe(false);
        expect(card?.selectedBy).toBeUndefined();
      }
    });
  });

  describe('실패 케이스', () => {
    it('게임을 찾을 수 없으면 실패해야 함', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM99',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('잘못된 roomId 형식이면 실패해야 함', async () => {
      // Arrange
      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: '',
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

    it('플레이어 수가 부족하면 실패해야 함 (3명)', async () => {
      // Arrange
      const game = createTestGame('ROOM05', 3);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM05',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('4~8명의 플레이어가 필요합니다');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('플레이어 수가 너무 많으면 실패해야 함 (9명)', async () => {
      // Arrange
      const game = createTestGame('ROOM06', 9);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM06',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('4~8명의 플레이어가 필요합니다');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('이미 시작된 게임은 다시 시작할 수 없어야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM07', 4);
      game.changePhase('roleSelection'); // 이미 시작된 상태
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM07',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('BUSINESS_RULE_VIOLATION');
        expect(response.error.message).toContain('대기 중인 게임만 시작할 수 있습니다');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('엣지 케이스', () => {
    it('정확히 4명(최소)일 때 게임을 시작해야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM08', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM08',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.playerCount).toBe(4);
      }
    });

    it('정확히 8명(최대)일 때 게임을 시작해야 함', async () => {
      // Arrange
      const game = createTestGame('ROOM09', 8);
      mockRepository.findById.mockResolvedValue(game);

      const request: StartGameRequest = {
        playerId: 'owner1',
        roomId: 'ROOM09',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.playerCount).toBe(8);
      }
    });
  });
});
