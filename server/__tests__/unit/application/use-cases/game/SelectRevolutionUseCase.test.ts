/**
 * SelectRevolutionUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { SelectRevolutionUseCase } from '../../../../../src/application/use-cases/game/SelectRevolutionUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { SelectRevolutionRequest } from '../../../../../src/application/dto/game/SelectRevolutionDto';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { Card } from '../../../../../src/domain/entities/Card';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('SelectRevolutionUseCase', () => {
  let useCase: SelectRevolutionUseCase;
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

    useCase = new SelectRevolutionUseCase(mockRepository);
  });

  // 테스트용 게임 생성 헬퍼 (조커 2장 보유자 포함)
  const createGameWithDoubleJoker = (
    roomId: string,
    playerCount: number = 4
  ): { game: Game; doubleJokerPlayer: Player } => {
    const game = Game.create(RoomId.from(roomId));

    // 플레이어 추가
    const players: Player[] = [];
    for (let i = 1; i <= playerCount; i++) {
      const player = Player.create(PlayerId.create(`player${i}`), `Player${i}`);
      player.assignRank(i);
      game.addPlayer(player);
      players.push(player);
    }

    // 조커 2장을 특정 플레이어에게 할당
    const doubleJokerPlayer = players[0]; // player1이 조커 2장 보유
    doubleJokerPlayer.assignCards([
      Card.create(13, true), // 조커 1
      Card.create(13, true), // 조커 2
      Card.create(5),
    ]);

    // 다른 플레이어들에게도 카드 할당
    for (let i = 1; i < players.length; i++) {
      players[i].assignCards([Card.create(i), Card.create(i + 1)]);
    }

    // 조커 플래그 설정
    doubleJokerPlayer.markHasDoubleJoker();

    // revolution 페이즈로 설정
    game.changePhase('revolution');
    game.setCurrentTurn(doubleJokerPlayer.id);

    return { game, doubleJokerPlayer };
  };

  describe('성공 케이스', () => {
    it('혁명 승인 시: 대혁명 (꼴찌 순위면 순위 반전)', async () => {
      // Arrange
      const { game, doubleJokerPlayer } = createGameWithDoubleJoker('ROOM01', 4);
      // player1을 꼴찌(rank 4)로 만들기
      doubleJokerPlayer.assignRank(4);

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.wantRevolution).toBe(true);
        expect(response.data.phase).toBe('playing');
        expect(response.data.revolutionStatus?.isRevolution).toBe(true);
        expect(response.data.revolutionStatus?.isGreatRevolution).toBe(true);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('혁명 승인 시: 일반혁명 (꼴찌가 아니면 순위 유지)', async () => {
      // Arrange
      const { game, doubleJokerPlayer } = createGameWithDoubleJoker('ROOM01', 4);
      // player1을 2등으로 만들기
      doubleJokerPlayer.assignRank(2);

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.wantRevolution).toBe(true);
        expect(response.data.phase).toBe('playing');
        expect(response.data.revolutionStatus?.isRevolution).toBe(true);
        expect(response.data.revolutionStatus?.isGreatRevolution).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('혁명 거부 시: 세금 교환 수행 후 tax 페이즈로 전환', async () => {
      // Arrange
      const { game } = createGameWithDoubleJoker('ROOM01', 4);

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: false,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.wantRevolution).toBe(false);
        expect(response.data.phase).toBe('tax');
        expect(response.data.revolutionStatus).toBeUndefined();
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      // 세금 교환이 수행되었는지 확인 (game.taxExchanges가 설정되었는지)
      expect(game.taxExchanges).toBeDefined();
      expect(game.taxExchanges?.length).toBeGreaterThan(0);
    });
  });

  describe('실패 케이스', () => {
    it('게임을 찾을 수 없으면 실패해야 함', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM99', // 유효한 형식이지만 존재하지 않는 방
        playerId: 'player1',
        wantRevolution: true,
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
      const request: SelectRevolutionRequest = {
        roomId: '',
        playerId: 'player1',
        wantRevolution: true,
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

    it('잘못된 playerId 형식이면 실패해야 함', async () => {
      // Arrange
      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: '',
        wantRevolution: true,
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

    it('게임 로직에서 에러 발생 시 실패 응답을 반환해야 함', async () => {
      // Arrange
      const { game } = createGameWithDoubleJoker('ROOM01', 4);
      // 잘못된 phase로 변경하여 에러 유발
      game.changePhase('waiting');

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: true,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        // 도메인 에러가 일반 Error로 던져지면 SELECT_REVOLUTION_FAILED로 변환됨
        expect(response.error.code).toBe('SELECT_REVOLUTION_FAILED');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('엣지 케이스', () => {
    it('5명 플레이어 게임에서 혁명 거부 시 올바른 세금 교환 발생', async () => {
      // Arrange
      const { game } = createGameWithDoubleJoker('ROOM01', 5);

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: false,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.phase).toBe('tax');
      }
      // 5명: 1위↔5위 2장, 2위↔4위 1장 = 총 4개의 교환
      expect(game.taxExchanges?.length).toBe(4);
    });

    it('8명 플레이어 게임에서 혁명 거부 시 올바른 세금 교환 발생', async () => {
      // Arrange
      const { game } = createGameWithDoubleJoker('ROOM01', 8);

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRevolutionRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        wantRevolution: false,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.phase).toBe('tax');
      }
      // 8명도 1위↔8위 2장, 2위↔7위 1장 = 총 4개의 교환
      expect(game.taxExchanges?.length).toBe(4);
    });
  });
});
