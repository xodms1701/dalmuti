import GameManager from '../game/GameManager';
import MockDatabase from './mocks/MockDatabase';

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = new MockDatabase();
    gameManager = new GameManager(mockDb);
  });

  afterEach(() => {
    mockDb.clear();
  });

  describe('createGame', () => {
    it('새로운 게임을 생성해야 합니다', async () => {
      const ownerId = 'owner1';
      const nickname = 'Player1';

      const game = await gameManager.createGame(ownerId, nickname);

      expect(game).not.toBeNull();
      expect(game?.ownerId).toBe(ownerId);
      expect(game?.players).toHaveLength(1);
      expect(game?.players[0].id).toBe(ownerId);
      expect(game?.players[0].nickname).toBe(nickname);
    });
  });

  describe('joinGame', () => {
    it('기존 게임에 플레이어가 참가할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const playerId = 'player1';
      const success = await gameManager.joinGame(game!.roomId, playerId, 'Player1');

      expect(success).toBe(true);

      const updatedGame = await mockDb.getGame(game!.roomId);
      expect(updatedGame?.players).toHaveLength(2);
      expect(updatedGame?.players[1].id).toBe(playerId);
    });

    it('존재하지 않는 게임에는 참가할 수 없어야 합니다', async () => {
      const success = await gameManager.joinGame('non-existent', 'player1', 'Player1');
      expect(success).toBe(false);
    });
  });

  describe('leaveGame', () => {
    it('플레이어가 게임에서 퇴장할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');

      const success = await gameManager.leaveGame(game!.roomId, 'player1');
      expect(success).toBe(true);

      const updatedGame = await mockDb.getGame(game!.roomId);
      expect(updatedGame?.players).toHaveLength(1);
    });

    it('마지막 플레이어가 퇴장하면 게임이 삭제되어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const success = await gameManager.leaveGame(game!.roomId, ownerId);
      expect(success).toBe(true);

      const deletedGame = await mockDb.getGame(game!.roomId);
      expect(deletedGame).toBeNull();
    });
  });

  describe('startGame', () => {
    it('유효한 플레이어 수로 게임을 시작할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      // 최소 플레이어 수만큼 참가
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      const success = await gameManager.startGame(game!.roomId);
      expect(success).toBe(true);

      const updatedGame = await mockDb.getGame(game!.roomId);
      expect(updatedGame?.phase).toBe('roleSelection');
      expect(updatedGame?.deck).toHaveLength(80); // 1부터 12까지의 카드 + 조커 2장
    });

    it('유효하지 않은 플레이어 수로는 게임을 시작할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const success = await gameManager.startGame(game!.roomId);
      expect(success).toBe(false);
    });
  });

  describe('playCard', () => {
    it('플레이어가 유효한 카드를 낼 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      // 최소 플레이어 수만큼 참가
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 게임 시작
      await gameManager.startGame(game!.roomId);

      // 역할 선택
      await gameManager.selectRole(game!.roomId, ownerId, 1);
      await gameManager.selectRole(game!.roomId, 'player1', 2);
      await gameManager.selectRole(game!.roomId, 'player2', 3);
      await gameManager.selectRole(game!.roomId, 'player3', 4);

      // 카드 배분
      await gameManager.dealCards(game!.roomId, ownerId);

      // 카드 선택
      await gameManager.selectDeck(game!.roomId, ownerId, 0);
      await gameManager.selectDeck(game!.roomId, 'player1', 1);
      await gameManager.selectDeck(game!.roomId, 'player2', 2);
      await gameManager.selectDeck(game!.roomId, 'player3', 3);

      const cards = game!.players.find((player) => player.id === ownerId)?.cards;
      const pickCard =
        cards && cards.length > 0
          ? cards.reduce((max, card) => (card.rank > max.rank ? card : max), cards[0])
          : undefined;
      if (!pickCard) {
        throw new Error('pickCard not found');
      }
      const playedGame = await gameManager.playCard(game!.roomId, ownerId, [pickCard]);

      expect(playedGame).not.toBeNull();
      expect(playedGame?.lastPlay?.playerId).toBe(ownerId);
    });

    it('유효하지 않은 카드를 낼 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');
      await gameManager.startGame(game!.roomId);

      const updatedGame = await gameManager.playCard(game!.roomId, ownerId, [
        { rank: 0, isJoker: false },
      ]);
      expect(updatedGame).not.toBeNull();
      expect(updatedGame?.lastPlay).toBeUndefined();
    });
  });

  describe('selectRole', () => {
    it('플레이어가 유효한 역할을 선택할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      // 최소 플레이어 수만큼 참가
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 게임 시작
      await gameManager.startGame(game!.roomId);

      const success = await gameManager.selectRole(game!.roomId, ownerId, 1);
      expect(success).toBe(true);

      const updatedGame = await mockDb.getGame(game!.roomId);
      expect(updatedGame?.players[0].role).toBe(1);
    });

    it('유효하지 않은 역할을 선택할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');
      await gameManager.startGame(game!.roomId);

      const success = await gameManager.selectRole(game!.roomId, ownerId, 0);
      expect(success).toBe(false);
    });
  });

  describe('dealCards', () => {
    it('모든 플레이어에게 카드를 배분할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      // 최소 플레이어 수만큼 참가
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 게임 시작
      await gameManager.startGame(game!.roomId);

      // 역할 선택
      await gameManager.selectRole(game!.roomId, ownerId, 1);
      await gameManager.selectRole(game!.roomId, 'player1', 2);
      await gameManager.selectRole(game!.roomId, 'player2', 3);
      await gameManager.selectRole(game!.roomId, 'player3', 4);

      const success = await gameManager.dealCards(game!.roomId, ownerId);
      expect(success).toBe(true);

      const updatedGame = await mockDb.getGame(game!.roomId);
      expect(updatedGame?.phase).toBe('cardSelection');
      expect(updatedGame?.selectableDecks).toHaveLength(4);
    });

    it('게임 소유자가 아닌 플레이어는 카드를 배분할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');
      await gameManager.startGame(game!.roomId);

      const success = await gameManager.dealCards(game!.roomId, 'player1');
      expect(success).toBe(false);
    });
  });

  describe('setPlayerReady', () => {
    it('플레이어의 준비 상태를 설정할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const updatedGame = await gameManager.setPlayerReady(game!.roomId, ownerId);
      expect(updatedGame).not.toBeNull();
      expect(updatedGame?.players[0].isReady).toBe(true);
    });

    it('존재하지 않는 플레이어의 준비 상태를 설정할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const updatedGame = await gameManager.setPlayerReady(game!.roomId, 'non-existent');
      expect(updatedGame).toBeNull();
    });
  });

  describe('vote', () => {
    it('플레이어의 투표를 기록할 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      // 최소 플레이어 수만큼 참가
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 게임 시작
      await gameManager.startGame(game!.roomId);

      // 역할 선택
      await gameManager.selectRole(game!.roomId, ownerId, 1);
      await gameManager.selectRole(game!.roomId, 'player1', 2);
      await gameManager.selectRole(game!.roomId, 'player2', 3);
      await gameManager.selectRole(game!.roomId, 'player3', 4);

      // 카드 배분
      await gameManager.dealCards(game!.roomId, ownerId);

      // 카드 선택
      await gameManager.selectDeck(game!.roomId, ownerId, 0);
      await gameManager.selectDeck(game!.roomId, 'player1', 1);
      await gameManager.selectDeck(game!.roomId, 'player2', 2);
      await gameManager.selectDeck(game!.roomId, 'player3', 3);

      // 게임 종료 상태로 설정
      const updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'gameEnd';
        updatedGame.isVoting = true;
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      const votedGame = await gameManager.vote(game!.roomId, ownerId, true);
      expect(votedGame).not.toBeNull();
      expect(votedGame?.votes[ownerId]).toBe(true);
    });

    it('투표 단계가 아닐 때는 투표할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const updatedGame = await gameManager.vote(game!.roomId, ownerId, true);
      expect(updatedGame).toBeNull();
    });
  });

  describe('selectDeck', () => {
    it('1등이 조커 2장을 가지면 rank가 그대로 유지되어야 한다', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');

      // 강제로 phase, rank, selectableDecks 설정
      const updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'cardSelection';
        updatedGame.currentTurn = ownerId;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[0].cards = [];
        updatedGame.players[1].cards = [];
        updatedGame.players[2].cards = [];
        updatedGame.selectableDecks = [
          {
            cards: [
              { isJoker: true, rank: 13 },
              { isJoker: true, rank: 13 },
            ],
            isSelected: false,
            selectedBy: undefined,
          },
          { cards: [{ isJoker: false, rank: 0 }], isSelected: false, selectedBy: undefined },
          { cards: [{ isJoker: false, rank: 0 }], isSelected: false, selectedBy: undefined },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 1등이 조커 2장 덱을 선택
      await gameManager.selectDeck(game!.roomId, ownerId, 0);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.players.find((p) => p.id === 'player1')?.rank).toBe(1);
      expect(resultGame?.players.find((p) => p.id === 'player2')?.rank).toBe(2);
      expect(resultGame?.players.find((p) => p.id === 'player3')?.rank).toBe(3);
    });
  });
});
