/**
 * GameApplicationService Integration Tests
 *
 * 실제 MongoDB와 연결하여 전체 게임 플로우를 테스트합니다.
 * Use Case들이 실제 Repository와 함께 작동하는지 검증합니다.
 */

import { GameCommandService } from '../../../src/application/services/GameCommandService';
import { MongoGameRepository } from '../../../src/infrastructure/repositories/MongoGameRepository';
import { CreateGameUseCase } from '../../../src/application/use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from '../../../src/application/use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from '../../../src/application/use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from '../../../src/application/use-cases/game/ReadyGameUseCase';
import { SelectRoleUseCase } from '../../../src/application/use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from '../../../src/application/use-cases/game/SelectDeckUseCase';
import { PlayCardUseCase } from '../../../src/application/use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from '../../../src/application/use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from '../../../src/application/use-cases/game/VoteNextGameUseCase';
import { DeleteGameUseCase } from '../../../src/application/use-cases/game/DeleteGameUseCase';
import { RoomId } from '../../../src/domain/value-objects/RoomId';
import { Card } from '../../../src/domain/entities/Card';

// 환경 변수 또는 기본값 사용
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dalmuti-test';

describe('GameApplicationService Integration Tests', () => {
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
    const selectRoleUseCase = new SelectRoleUseCase(repository);
    const selectDeckUseCase = new SelectDeckUseCase(repository);
    const playCardUseCase = new PlayCardUseCase(repository);
    const passTurnUseCase = new PassTurnUseCase(repository);
    const voteNextGameUseCase = new VoteNextGameUseCase(repository);
    const deleteGameUseCase = new DeleteGameUseCase(repository);

    // Application Service 생성
    service = new GameCommandService(
      createGameUseCase,
      joinGameUseCase,
      leaveGameUseCase,
      readyGameUseCase,
      selectRoleUseCase,
      selectDeckUseCase,
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

  describe('createAndJoinGame', () => {
    it('should create game and join creator in one flow', async () => {
      // Arrange
      const creatorId = 'creator1';
      const nickname = 'Alice';

      // Act
      const result = await service.createAndJoinGame(creatorId, nickname);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomId).toBeDefined();
        expect(result.data.roomId).toHaveLength(6);
        expect(result.data.playerId).toBe(creatorId);
        expect(result.data.playerCount).toBe(1);

        // DB에서 확인
        const game = await repository.findById(RoomId.from(result.data.roomId));
        expect(game).not.toBeNull();
        expect(game!.players).toHaveLength(1);
        expect(game!.players[0].id.value).toBe(creatorId);
        expect(game!.players[0].nickname).toBe(nickname);
      }
    });

    it('should create game with specified roomId', async () => {
      // Arrange
      const creatorId = 'creator2';
      const nickname = 'Bob';
      const roomId = 'CUSTOM';

      // Act
      const result = await service.createAndJoinGame(creatorId, nickname, roomId);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomId).toBe('CUSTOM');

        // DB에서 확인
        const game = await repository.findById(RoomId.from('CUSTOM'));
        expect(game).not.toBeNull();
      }
    });

    it('should return error when roomId is invalid', async () => {
      // Arrange
      const creatorId = 'creator3';
      const nickname = 'Charlie';
      const invalidRoomId = 'TOOLONG123';

      // Act
      const result = await service.createAndJoinGame(creatorId, nickname, invalidRoomId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }

      // DB에 게임이 생성되지 않았는지 확인
      const games = await repository.findAll();
      expect(games).toHaveLength(0);
    });

    // TODO: 보상 트랜잭션 테스트 추가
    // join이 실패했을 때 생성된 게임이 삭제되는지 검증하는 테스트 필요
    // Mock을 사용하여 joinGameUseCase.execute()가 실패하도록 만들고,
    // repository.findById()로 게임이 삭제되었는지 확인
  });

  describe('toggleReadyAndCheckStart', () => {
    it('should toggle ready state and detect all players ready', async () => {
      // Arrange - 게임 생성 및 4명 참가
      const roomId = RoomId.generate().value;
      await service.createAndJoinGame('p1', 'Alice', roomId);

      const joinUseCase = new JoinGameUseCase(repository);
      await joinUseCase.execute({ roomId, playerId: 'p2', nickname: 'Bob' });
      await joinUseCase.execute({ roomId, playerId: 'p3', nickname: 'Charlie' });
      await joinUseCase.execute({ roomId, playerId: 'p4', nickname: 'David' });

      // Act - 모든 플레이어 준비
      const result1 = await service.toggleReadyAndCheckStart(roomId, 'p1');
      const result2 = await service.toggleReadyAndCheckStart(roomId, 'p2');
      const result3 = await service.toggleReadyAndCheckStart(roomId, 'p3');
      const result4 = await service.toggleReadyAndCheckStart(roomId, 'p4');

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect(result4.success).toBe(true);

      if (result4.success) {
        expect(result4.data.allPlayersReady).toBe(true);
        expect(result4.data.canStartGame).toBe(true);
      }
    });

    it('should detect not all players ready', async () => {
      // Arrange
      const roomId = RoomId.generate().value;
      await service.createAndJoinGame('p1', 'Alice', roomId);

      const joinUseCase = new JoinGameUseCase(repository);
      await joinUseCase.execute({ roomId, playerId: 'p2', nickname: 'Bob' });

      // Act - 1명만 준비
      const result = await service.toggleReadyAndCheckStart(roomId, 'p1');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allPlayersReady).toBe(false);
        expect(result.data.canStartGame).toBe(false);
      }
    });

    it('should handle unready action', async () => {
      // Arrange
      const roomId = RoomId.generate().value;
      await service.createAndJoinGame('p1', 'Alice', roomId);

      await service.toggleReadyAndCheckStart(roomId, 'p1');

      // Act - 준비 취소 (toggle이므로 한 번 더 호출)
      const result = await service.toggleReadyAndCheckStart(roomId, 'p1');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isReady).toBe(false);
        expect(result.data.allPlayersReady).toBe(false);
      }
    });
  });

  describe('playOrPass', () => {
    it('should handle card play', async () => {
      // Arrange - 게임 생성 및 플레이어 추가 (간단한 시나리오)
      const roomId = RoomId.generate().value;
      await service.createAndJoinGame('p1', 'Alice', roomId);

      const joinUseCase = new JoinGameUseCase(repository);
      await joinUseCase.execute({ roomId, playerId: 'p2', nickname: 'Bob' });

      // 게임을 playing 상태로 변경하고 카드 할당 (실제로는 더 복잡한 플로우)
      const game = await repository.findById(RoomId.from(roomId));
      game!.changePhase('playing');
      game!.setCurrentTurn(game!.players[0].id);

      // 플레이어에게 카드 할당
      const cards = [Card.create(5, false)];
      game!.players[0].assignCards(cards);

      await repository.update(RoomId.from(roomId), game!);

      // Act
      const result = await service.playOrPass(roomId, 'p1', [{ rank: 5, isJoker: false }]);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe('play');
        expect(result.data.playedCards).toEqual([{ rank: 5, isJoker: false }]);
        expect(result.data.nextTurn).toBeDefined();
      }
    });

    it('should handle pass when cards array is empty', async () => {
      // Arrange
      const roomId = RoomId.generate().value;
      await service.createAndJoinGame('p1', 'Alice', roomId);

      const joinUseCase = new JoinGameUseCase(repository);
      await joinUseCase.execute({ roomId, playerId: 'p2', nickname: 'Bob' });

      // 게임을 playing 상태로 변경
      const game = await repository.findById(RoomId.from(roomId));
      game!.changePhase('playing');
      game!.setCurrentTurn(game!.players[0].id);
      await repository.update(RoomId.from(roomId), game!);

      // Act
      const result = await service.playOrPass(roomId, 'p1', []);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe('pass');
        expect(result.data.nextTurn).toBeDefined();
      }
    });
  });

  describe('Full game flow scenario', () => {
    it('should handle complete game creation to player joining flow', async () => {
      // 1. 게임 생성 및 생성자 참가
      const createResult = await service.createAndJoinGame('p1', 'Alice');
      expect(createResult.success).toBe(true);

      const roomId = createResult.success ? createResult.data.roomId : '';

      // 2. 3명 추가 참가 (총 4명)
      const joinUseCase = new JoinGameUseCase(repository);
      const join2 = await joinUseCase.execute({
        roomId,
        playerId: 'p2',
        nickname: 'Bob',
      });
      const join3 = await joinUseCase.execute({
        roomId,
        playerId: 'p3',
        nickname: 'Charlie',
      });
      const join4 = await joinUseCase.execute({
        roomId,
        playerId: 'p4',
        nickname: 'David',
      });

      expect(join2.success).toBe(true);
      expect(join3.success).toBe(true);
      expect(join4.success).toBe(true);

      // 3. 모든 플레이어 준비
      const ready1 = await service.toggleReadyAndCheckStart(roomId, 'p1');
      const ready2 = await service.toggleReadyAndCheckStart(roomId, 'p2');
      const ready3 = await service.toggleReadyAndCheckStart(roomId, 'p3');
      const ready4 = await service.toggleReadyAndCheckStart(roomId, 'p4');

      expect(ready1.success).toBe(true);
      expect(ready2.success).toBe(true);
      expect(ready3.success).toBe(true);
      expect(ready4.success).toBe(true);

      if (ready4.success) {
        expect(ready4.data.canStartGame).toBe(true);
      }

      // 4. DB에서 최종 상태 확인
      const game = await repository.findById(RoomId.from(roomId));
      expect(game).not.toBeNull();
      expect(game!.players).toHaveLength(4);
      expect(game!.players.every((p) => p.isReady)).toBe(true);
    });
  });
});
