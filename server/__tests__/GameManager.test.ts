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

    it('다른 숫자의 카드를 한꺼번에 낼 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');
      await gameManager.startGame(game!.roomId);

      // 강제로 phase와 cards 설정
      const updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.players[0].cards = [
          { rank: 1, isJoker: false },
          { rank: 2, isJoker: false },
          { rank: 3, isJoker: false },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 다른 숫자의 카드를 한꺼번에 내려고 시도
      const resultGame = await gameManager.playCard(game!.roomId, ownerId, [
        { rank: 1, isJoker: false },
        { rank: 2, isJoker: false },
      ]);

      expect(resultGame).not.toBeNull();
      expect(resultGame?.lastPlay).toBeUndefined();
    });

    it('같은 숫자의 카드와 조커는 한꺼번에 낼 수 있어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player1', 'Player1');
      await gameManager.startGame(game!.roomId);

      // 강제로 phase와 cards 설정
      const updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = ownerId;
        updatedGame.players[0].cards = [
          { rank: 1, isJoker: false },
          { rank: 2, isJoker: false },
          { rank: 2, isJoker: false },
          { rank: 13, isJoker: true },
        ];
        updatedGame.players[1].cards = [
          { rank: 1, isJoker: false },
          { rank: 4, isJoker: false },
          { rank: 4, isJoker: false },
          { rank: 13, isJoker: true },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 같은 숫자의 카드와 조커를 한꺼번에 내려고 시도
      const resultGame = await gameManager.playCard(game!.roomId, ownerId, [
        { rank: 2, isJoker: false },
        { rank: 2, isJoker: false },
        { rank: 13, isJoker: true },
      ]);

      expect(resultGame).not.toBeNull();
      expect(resultGame?.lastPlay).not.toBeUndefined();
      expect(resultGame?.lastPlay?.playerId).toBe(ownerId);
      expect(resultGame?.lastPlay?.cards).toHaveLength(3);
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
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, selectableDecks 설정
      const updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'cardSelection';
        updatedGame.currentTurn = ownerId;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = [];
        updatedGame.players[1].cards = [];
        updatedGame.players[2].cards = [];
        updatedGame.players[3].cards = [];
        updatedGame.selectableDecks = [
          {
            cards: [
              { isJoker: true, rank: 13 },
              { isJoker: true, rank: 13 },
            ],
            isSelected: false,
            selectedBy: undefined,
          },
          { cards: [{ isJoker: false, rank: 1 }], isSelected: false, selectedBy: undefined },
          { cards: [{ isJoker: false, rank: 2 }], isSelected: false, selectedBy: undefined },
          { cards: [{ isJoker: false, rank: 3 }], isSelected: false, selectedBy: undefined },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 1등이 조커 2장 덱을 선택
      await gameManager.selectDeck(game!.roomId, ownerId, 0);
      await gameManager.selectDeck(game!.roomId, 'player2', 1);
      await gameManager.selectDeck(game!.roomId, 'player3', 2);
      await gameManager.selectDeck(game!.roomId, 'player4', 3);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.currentTurn).toBe(ownerId);
      expect(resultGame?.players.find((p) => p.id === 'player1')?.rank).toBe(1);
      expect(resultGame?.players.find((p) => p.id === 'player2')?.rank).toBe(2);
      expect(resultGame?.players.find((p) => p.id === 'player3')?.rank).toBe(3);
      expect(resultGame?.players.find((p) => p.id === 'player4')?.rank).toBe(4);
    });

    it('2등이 조커 2장을 가지면 rank가 1등이 되어야 한다', async () => {
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
          { cards: [{ isJoker: false, rank: 9 }], isSelected: false, selectedBy: undefined },
          {
            cards: [
              { isJoker: true, rank: 13 },
              { isJoker: true, rank: 13 },
            ],
            isSelected: false,
            selectedBy: undefined,
          },
          { cards: [{ isJoker: false, rank: 7 }], isSelected: false, selectedBy: undefined },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 2등이 조커 2장 덱을 선택
      await gameManager.selectDeck(game!.roomId, 'player1', 0);
      await gameManager.selectDeck(game!.roomId, 'player2', 1);
      await gameManager.selectDeck(game!.roomId, 'player3', 2);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.currentTurn).toBe('player2');
      expect(resultGame?.players.find((p) => p.id === 'player2')?.rank).toBe(1); // player2가 1등이 됨
      expect(resultGame?.players.find((p) => p.id === 'player3')?.rank).toBe(2); // player3이 2등이 됨
      expect(resultGame?.players.find((p) => p.id === 'player1')?.rank).toBe(3); // player1이 3등이 됨
    });

    it('3등이 조커 2장을 가지면 rank가 1등이 되어야 한다', async () => {
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
          { cards: [{ isJoker: false, rank: 1 }], isSelected: false, selectedBy: undefined },
          { cards: [{ isJoker: false, rank: 2 }], isSelected: false, selectedBy: undefined },
          {
            cards: [
              { isJoker: true, rank: 13 },
              { isJoker: true, rank: 13 },
            ],
            isSelected: false,
            selectedBy: undefined,
          },
        ];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 3등이 조커 2장 덱을 선택
      await gameManager.selectDeck(game!.roomId, 'player1', 0);
      await gameManager.selectDeck(game!.roomId, 'player2', 1);
      await gameManager.selectDeck(game!.roomId, 'player3', 2);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.currentTurn).toBe('player3');
      expect(resultGame?.players.find((p) => p.id === 'player3')?.rank).toBe(1); // player3이 1등이 됨
      expect(resultGame?.players.find((p) => p.id === 'player1')?.rank).toBe(2); // player1이 2등이 됨
      expect(resultGame?.players.find((p) => p.id === 'player2')?.rank).toBe(3); // player2이 3등이 됨
    });
  });

  describe('passTurn', () => {
    it('모든 플레이어가 패스했을 때 라운드가 변경되어야 합니다', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player1';
        updatedGame.lastPlay = undefined;
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = [{ rank: 1, isJoker: false }]; // player1은 카드 1장
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }]; // player2는 카드 1장
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }]; // player3는 카드 1장
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }]; // player4는 카드 1장
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player1이 카드를 낸다
      updatedGame = await gameManager.playCard(game!.roomId, 'player1', [
        { rank: 1, isJoker: false },
      ]);
      expect(updatedGame?.lastPlay?.playerId).toBe('player1');
      expect(updatedGame?.lastPlay?.cards).toEqual([{ rank: 1, isJoker: false }]);
      expect(updatedGame?.currentTurn).toBe('player2');
      expect(updatedGame?.finishedPlayers).toEqual(['player1']);

      // player2,3,4가 패스한다
      await gameManager.passTurn(game!.roomId, 'player2');
      await gameManager.passTurn(game!.roomId, 'player3');
      await gameManager.passTurn(game!.roomId, 'player4');

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.round).toBe(2); // 라운드가 변경되어야 함
      expect(resultGame?.lastPlay).toBeUndefined(); // lastPlay가 초기화되어야 함
      expect(resultGame?.players[0].isPassed).toBe(false); // player1의 isPassed가 false로 초기화되어야 함
      expect(resultGame?.currentTurn).toBe('player2');
    });

    it('모든 플레이어가 패스했을 때 마지막으로 카드를 낸 플레이어의 턴이 건너뛰어지지 않아야 함', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player1';
        updatedGame.lastPlay = undefined;
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = [
          { rank: 1, isJoker: false },
          { rank: 2, isJoker: false },
        ]; // player1은 카드 1장
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }]; // player2는 카드 1장
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }]; // player3는 카드 1장
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }]; // player4는 카드 1장
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player1이 카드를 낸다
      updatedGame = await gameManager.playCard(game!.roomId, 'player1', [
        { rank: 1, isJoker: false },
      ]);
      expect(updatedGame?.lastPlay?.playerId).toBe('player1');
      expect(updatedGame?.lastPlay?.cards).toEqual([{ rank: 1, isJoker: false }]);
      expect(updatedGame?.currentTurn).toBe('player2');

      // player2,3,4가 패스한다
      await gameManager.passTurn(game!.roomId, 'player2');
      await gameManager.passTurn(game!.roomId, 'player3');
      await gameManager.passTurn(game!.roomId, 'player4');

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.round).toBe(2); // 라운드가 변경되어야 함
      expect(resultGame?.lastPlay).toBeUndefined(); // lastPlay가 초기화되어야 함
      expect(resultGame?.players[0].isPassed).toBe(false); // player1의 isPassed가 false로 초기화되어야 함
      expect(resultGame?.currentTurn).toBe('player1'); // 마지막으로 카드를 낸 player1이 다음 턴이 되어야 함
    });

    it('모든 플레이어가 패스했을 때 마지막으로 카드를 낸 플레이어가 카드가 없으면 다음 플레이어로 넘어가야 함', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player1';
        updatedGame.lastPlay = undefined;
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = [{ rank: 1, isJoker: false }]; // player1은 카드 1장
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }]; // player2는 카드 1장
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }]; // player3는 카드 1장
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }]; // player4는 카드 1장
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player1이 마지막 카드를 내고 게임 완료
      updatedGame = await gameManager.playCard(game!.roomId, 'player1', [
        { rank: 1, isJoker: false },
      ]);
      expect(updatedGame?.lastPlay?.playerId).toBe('player1');
      expect(updatedGame?.lastPlay?.cards).toEqual([{ rank: 1, isJoker: false }]);
      expect(updatedGame?.currentTurn).toBe('player2');
      expect(updatedGame?.finishedPlayers).toEqual(['player1']);

      // player2,3,4가 패스한다
      await gameManager.passTurn(game!.roomId, 'player2');
      await gameManager.passTurn(game!.roomId, 'player3');
      await gameManager.passTurn(game!.roomId, 'player4');

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.round).toBe(2); // 라운드가 변경되어야 함
      expect(resultGame?.lastPlay).toBeUndefined(); // lastPlay가 초기화되어야 함
      expect(resultGame?.players[0].isPassed).toBe(false); // player1의 isPassed가 false로 초기화되어야 함
      expect(resultGame?.currentTurn).toBe('player2'); // player1은 카드가 없으므로 player2가 다음 턴이 되어야 함
    });
  });
});
