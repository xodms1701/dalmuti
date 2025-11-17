/**
 * Full Game Flow E2E Tests
 *
 * 대기실 → 역할 선택 → 덱 선택 → 혁명/세금 → 게임 플레이 전체 플로우 테스트
 *
 * E2E 테스트는 실제 애플리케이션 동작과 유사하게 Service 계층을 통해 호출합니다.
 */

import { GameCommandService } from '../../src/application/services/GameCommandService';
import { MongoGameRepository } from '../../src/infrastructure/repositories/MongoGameRepository';
import { CreateGameUseCase } from '../../src/application/use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from '../../src/application/use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from '../../src/application/use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from '../../src/application/use-cases/game/ReadyGameUseCase';
import { StartGameUseCase } from '../../src/application/use-cases/game/StartGameUseCase';
import { SelectRoleUseCase } from '../../src/application/use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from '../../src/application/use-cases/game/SelectDeckUseCase';
import { SelectRevolutionUseCase } from '../../src/application/use-cases/game/SelectRevolutionUseCase';
import { PlayCardUseCase } from '../../src/application/use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from '../../src/application/use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from '../../src/application/use-cases/game/VoteNextGameUseCase';
import { DeleteGameUseCase } from '../../src/application/use-cases/game/DeleteGameUseCase';
import { RoomId } from '../../src/domain/value-objects/RoomId';
import { Card } from '../../src/domain/entities/Card';
import { SelectableDeck } from '../../src/domain/types/GameTypes';

// 환경 변수 또는 기본값 사용
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dalmuti-test-e2e';

describe('Full Game Flow E2E Tests', () => {
  let service: GameCommandService;
  let repository: MongoGameRepository;

  beforeAll(async () => {
    // 실제 MongoDB 연결
    repository = new MongoGameRepository(MONGO_URI, DB_NAME);
    await repository.connect();

    // Use Cases 생성
    const createGameUseCase = new CreateGameUseCase(repository);
    const joinGameUseCase = new JoinGameUseCase(repository);
    const leaveGameUseCase = new LeaveGameUseCase(repository);
    const readyGameUseCase = new ReadyGameUseCase(repository);
    const startGameUseCase = new StartGameUseCase(repository);
    const selectRoleUseCase = new SelectRoleUseCase(repository);
    const selectDeckUseCase = new SelectDeckUseCase(repository);
    const selectRevolutionUseCase = new SelectRevolutionUseCase(repository);
    const playCardUseCase = new PlayCardUseCase(repository);
    const passTurnUseCase = new PassTurnUseCase(repository);
    const voteNextGameUseCase = new VoteNextGameUseCase(repository);
    const deleteGameUseCase = new DeleteGameUseCase(repository);

    // GameCommandService 생성 (E2E 테스트는 Service 계층을 통해 호출)
    service = new GameCommandService(
      createGameUseCase,
      joinGameUseCase,
      leaveGameUseCase,
      readyGameUseCase,
      startGameUseCase,
      selectRoleUseCase,
      selectDeckUseCase,
      selectRevolutionUseCase,
      playCardUseCase,
      passTurnUseCase,
      voteNextGameUseCase,
      deleteGameUseCase
    );
  });

  afterAll(async () => {
    // MongoDB 연결 해제
    await repository.disconnect();
  });

  beforeEach(async () => {
    // 각 테스트 전에 컬렉션 정리
    const collection = repository.getCollection();
    await collection.deleteMany({});
  });

  afterEach(async () => {
    // 각 테스트 후에도 컬렉션 정리 (테스트 격리 보장)
    const collection = repository.getCollection();
    await collection.deleteMany({});
  });

  describe('Complete Game Flow: Waiting Room → Role Selection → Deck Selection → Tax/Revolution → Playing', () => {
    it('should complete full game flow from waiting room to playing phase', async () => {
      // ==================== Phase 1: 대기실 (Waiting Room) ====================

      // 1-1. 게임 생성 및 생성자 참가
      const createResult = await service.createAndJoinGame('player1', 'Alice');
      expect(createResult.success).toBe(true);
      const roomId = createResult.success ? createResult.data.roomId : '';

      // 1-2. 3명 추가 참가 (총 4명)
      const join2 = await service.joinGame(roomId, 'player2', 'Bob');
      const join3 = await service.joinGame(roomId, 'player3', 'Charlie');
      const join4 = await service.joinGame(roomId, 'player4', 'David');

      expect(join2.success).toBe(true);
      expect(join3.success).toBe(true);
      expect(join4.success).toBe(true);

      // 1-3. 모든 플레이어 준비
      await service.toggleReadyAndCheckStart(roomId, 'player1');
      await service.toggleReadyAndCheckStart(roomId, 'player2');
      await service.toggleReadyAndCheckStart(roomId, 'player3');
      const ready4 = await service.toggleReadyAndCheckStart(roomId, 'player4');

      expect(ready4.success).toBe(true);
      if (ready4.success) {
        expect(ready4.data.canStartGame).toBe(true);
      }

      // 1-4. 게임 시작
      const startResult = await service.startGame(roomId);
      expect(startResult.success).toBe(true);
      if (startResult.success) {
        expect(startResult.data.phase).toBe('roleSelection');
      }

      // 1-5. DB에서 게임 상태 확인
      let game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();
      expect(game!.phase).toBe('roleSelection');
      expect(game!.deck).toBeDefined();
      expect(game!.deck?.length).toBe(54); // 52 + 2 jokers
      expect(game!.roleSelectionCards).toBeDefined();
      expect(game!.roleSelectionCards?.length).toBe(13);

      // ==================== Phase 2: 역할 선택 (Role Selection) ====================

      // 2-1. 각 플레이어가 역할 카드 선택 (1-4번 카드 선택)
      const role1 = await service.selectRole(roomId, 'player1', 1);
      const role2 = await service.selectRole(roomId, 'player2', 2);
      const role3 = await service.selectRole(roomId, 'player3', 3);
      const role4 = await service.selectRole(roomId, 'player4', 4);

      expect(role1.success).toBe(true);
      expect(role2.success).toBe(true);
      expect(role3.success).toBe(true);
      expect(role4.success).toBe(true);

      // 2-2. 역할 선택 완료 후 자동으로 cardSelection 페이즈로 전환됨
      // SelectRoleUseCase가 자동으로 처리: 덱 생성, 페이즈 전환, 턴 설정
      game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();
      expect(game!.phase).toBe('cardSelection');
      expect(game!.selectableDecks).toBeDefined();
      expect(game!.selectableDecks?.length).toBe(4); // 4명이므로 4개 덱

      // 역할에 따라 정렬된 플레이어 목록 (테스트 검증용)
      const sortedPlayers = game!.players.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

      // ==================== Phase 3: 덱 선택 (Deck Selection) ====================

      // 3-1. 각 플레이어가 순서대로 덱 선택 (rank 순서: 1, 2, 3, 4)
      // Helper: 아직 선택되지 않은 첫 번째 덱의 인덱스 찾기
      const findAvailableDeckIndex = (decks: SelectableDeck[]): number =>
        decks.findIndex((deck) => !deck.isSelected);

      // Player 1 덱 선택
      game = await repository.findById(RoomId.from(roomId));
      const deck1Index = findAvailableDeckIndex(game!.selectableDecks!);
      const deck1 = await service.selectDeck(roomId, 'player1', deck1Index);
      expect(deck1.success).toBe(true);

      // Player 2 덱 선택 (SelectDeckUseCase가 자동으로 턴을 넘김)
      game = await repository.findById(RoomId.from(roomId));
      const deck2Index = findAvailableDeckIndex(game!.selectableDecks!);
      const deck2 = await service.selectDeck(roomId, 'player2', deck2Index);
      expect(deck2.success).toBe(true);

      // Player 3 덱 선택 (SelectDeckUseCase가 자동으로 턴을 넘김)
      game = await repository.findById(RoomId.from(roomId));
      const deck3Index = findAvailableDeckIndex(game!.selectableDecks!);
      const deck3 = await service.selectDeck(roomId, 'player3', deck3Index);
      expect(deck3.success).toBe(true);

      // Player 4 덱 선택 (SelectDeckUseCase가 자동으로 턴을 넘김)
      game = await repository.findById(RoomId.from(roomId));
      const deck4Index = findAvailableDeckIndex(game!.selectableDecks!);
      const deck4 = await service.selectDeck(roomId, 'player4', deck4Index);
      expect(deck4.success).toBe(true);

      // 3-2. 덱 선택 완료 후 상태 확인
      game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();

      // Phase는 조커 2장 보유자 유무에 따라 'revolution' 또는 'tax'
      expect(['revolution', 'tax']).toContain(game!.phase);

      // 3-3. 모든 플레이어가 카드를 받았는지 확인
      expect(game!.players.every((p) => p.cards.length > 0)).toBe(true);

      // ==================== Phase 4: 혁명 처리 (Revolution) ====================

      // 4-1. 조커 2장 보유자 확인
      const doubleJokerPlayer = game!.checkDoubleJoker();

      if (doubleJokerPlayer) {
        // 조커 2장 보유자가 있으면 혁명 선택
        expect(game!.phase).toBe('revolution');

        // 혁명 거부 (세금 교환으로 진행)
        const revolutionResult = await service.selectRevolution(
          roomId,
          doubleJokerPlayer.id.value,
          false
        );

        expect(revolutionResult.success).toBe(true);
        if (revolutionResult.success) {
          expect(revolutionResult.data.phase).toBe('tax');
        }
      } else {
        // 조커 2장 보유자가 없으면 자동으로 tax phase로 전환되어 있어야 함
        expect(game!.phase).toBe('tax');
      }

      // ==================== Phase 5: 세금 교환 (Tax Exchange) ====================

      // 5-1. 세금 교환 후 상태 확인
      game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();
      expect(game!.phase).toBe('tax');

      // taxExchanges가 설정되어 있는지 확인
      // (조커 2장 보유자가 없거나, 혁명 거부한 경우 설정됨)
      if (game!.taxExchanges) {
        expect(game!.taxExchanges.length).toBeGreaterThan(0);
        // 4명: 1위↔4위 2장, 1위↔4위 2장 = 총 2개 교환 쌍
        expect(game!.taxExchanges.length).toBe(2);
      }

      // ==================== Phase 6: 게임 플레이 준비 완료 ====================

      // 6-1. 최종 게임 상태 확인
      expect(game!.currentTurn).toBeDefined();
      expect(game!.round).toBe(1);

      // 6-2. 모든 플레이어 상태 확인
      expect(game!.players.length).toBe(4);
      expect(game!.players.every((p) => p.rank !== null)).toBe(true);
      expect(game!.players.every((p) => p.role !== null)).toBe(true);
      expect(game!.players.every((p) => p.cards.length > 0)).toBe(true);
    });

    it('should handle revolution acceptance (대혁명) when double joker holder is last rank', async () => {
      // 1. 게임 생성 및 4명 참가
      const createResult = await service.createAndJoinGame('player1', 'Alice');
      const roomId = createResult.success ? createResult.data.roomId : '';

      await service.joinGame(roomId, 'player2', 'Bob');
      await service.joinGame(roomId, 'player3', 'Charlie');
      await service.joinGame(roomId, 'player4', 'David');

      // 2. 모든 플레이어 준비 및 게임 시작
      await service.toggleReadyAndCheckStart(roomId, 'player1');
      await service.toggleReadyAndCheckStart(roomId, 'player2');
      await service.toggleReadyAndCheckStart(roomId, 'player3');
      await service.toggleReadyAndCheckStart(roomId, 'player4');
      await service.startGame(roomId);

      // 3. 역할 선택 (player4를 꼴찌로 만들기 위해 13번 선택)
      // SelectRoleUseCase가 자동으로 rank를 할당함
      await service.selectRole(roomId, 'player1', 1);
      await service.selectRole(roomId, 'player2', 2);
      await service.selectRole(roomId, 'player3', 3);
      await service.selectRole(roomId, 'player4', 13);

      // 4. DB에서 게임 가져와서 rank 확인
      let game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();

      // player4가 rank 4 (꼴찌)인지 확인
      const player4 = game!.players.find((p) => p.id.value === 'player4');
      expect(player4).toBeDefined();
      expect(player4!.rank).toBe(4);

      // 조커 2장을 player4에게 할당하기 위해 덱을 조작
      // (실제로는 덱 선택 과정에서 랜덤하게 할당되지만, 테스트를 위해 조작)
      const joker1 = Card.create(13, true);
      const joker2 = Card.create(13, true);
      const normalCard = Card.create(5, false);

      player4!.assignCards([joker1, joker2, normalCard]);
      player4!.markHasDoubleJoker();

      // 다른 플레이어들에게도 카드 할당
      game!.players
        .filter((p) => p.id.value !== 'player4')
        .forEach((p, i) => {
          p.assignCards([Card.create(i + 1), Card.create(i + 2)]);
        });

      // revolution 페이즈로 변경
      game!.changePhase('revolution');
      game!.setCurrentTurn(player4!.id);

      await repository.update(RoomId.from(roomId), game!);

      // 5. 혁명 승인 (대혁명)
      const revolutionResult = await service.selectRevolution(roomId, 'player4', true);

      expect(revolutionResult.success).toBe(true);
      if (revolutionResult.success) {
        expect(revolutionResult.data.wantRevolution).toBe(true);
        expect(revolutionResult.data.phase).toBe('playing');
        expect(revolutionResult.data.revolutionStatus?.isRevolution).toBe(true);
        expect(revolutionResult.data.revolutionStatus?.isGreatRevolution).toBe(true);
      }
    });
  });
});
