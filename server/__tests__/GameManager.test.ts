import GameManager from '../game/GameManager';
import MockDatabase from './mocks/MockDatabase';
import { Server } from 'socket.io';

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockDb: MockDatabase;
  let mockIo: any;

  beforeEach(() => {
    mockDb = new MockDatabase();
    // Mock Socket.IO Server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gameManager = new GameManager(mockDb, mockIo as Server);
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

      // 강제로 게임 상태 설정 (더블 조커 없이)
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.players[0].rank = 1;
        updatedGame.players[1].rank = 2;
        updatedGame.players[2].rank = 3;
        updatedGame.players[3].rank = 4;
        updatedGame.players[0].cards = [
          { rank: 1, isJoker: false },
          { rank: 2, isJoker: false },
        ];
        updatedGame.players[1].cards = [
          { rank: 3, isJoker: false },
          { rank: 4, isJoker: false },
        ];
        updatedGame.players[2].cards = [
          { rank: 5, isJoker: false },
          { rank: 6, isJoker: false },
        ];
        updatedGame.players[3].cards = [
          { rank: 7, isJoker: false },
          { rank: 8, isJoker: false },
        ];
        updatedGame.currentTurn = ownerId;
        updatedGame.round = 1;
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 업데이트된 게임 상태 가져오기
      updatedGame = await mockDb.getGame(game!.roomId);

      // 게임이 playing 상태인지 확인
      expect(updatedGame?.phase).toBe('playing');
      expect(updatedGame?.currentTurn).toBeTruthy();

      // 현재 턴인 플레이어 찾기
      const currentPlayerId = updatedGame!.currentTurn!;
      const player = updatedGame!.players.find((p) => p.id === currentPlayerId);
      expect(player?.cards.length).toBeGreaterThan(0);

      const cards = player?.cards;
      const pickCard =
        cards && cards.length > 0
          ? cards.reduce((max, card) => (card.rank > max.rank ? card : max), cards[0])
          : undefined;
      if (!pickCard) {
        throw new Error('pickCard not found');
      }

      const playedGame = await gameManager.playCard(game!.roomId, currentPlayerId, [pickCard]);

      expect(playedGame).not.toBeNull();
      expect(playedGame?.lastPlay?.playerId).toBe(currentPlayerId);
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

  // dealCards 테스트는 제거됨 - selectRole에서 자동으로 카드 배분이 처리됨

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

      // 역할 선택 (마지막 플레이어가 선택하면 자동으로 카드 배분됨)
      await gameManager.selectRole(game!.roomId, ownerId, 1);
      await gameManager.selectRole(game!.roomId, 'player1', 2);
      await gameManager.selectRole(game!.roomId, 'player2', 3);
      await gameManager.selectRole(game!.roomId, 'player3', 4);

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

    it('2등이 조커 2장을 가지면 revolution 페이즈로 가야 한다', async () => {
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
      expect(resultGame?.phase).toBe('revolution'); // revolution 페이즈로 전환
      expect(resultGame?.currentTurn).toBe('player2');
      expect(resultGame?.players.find((p) => p.id === 'player2')?.hasDoubleJoker).toBe(true);
    });

    it('3등이 조커 2장을 가지면 revolution 페이즈로 가야 한다', async () => {
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
      expect(resultGame?.phase).toBe('revolution'); // revolution 페이즈로 전환
      expect(resultGame?.currentTurn).toBe('player3');
      expect(resultGame?.players.find((p) => p.id === 'player3')?.hasDoubleJoker).toBe(true);
    });
  });

  describe('passTurn', () => {
    it('게임 완료한 플레이어가 있을 때도 패스할 수 있어야 합니다', async () => {
      // 1. 게임 상태를 준비 - 4명 중 1명이 게임 완료
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player2';
        updatedGame.lastPlay = {
          playerId: 'player1',
          cards: [{ rank: 1, isJoker: false }],
        };
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = []; // player1은 게임 완료
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[0].isPassed = false; // 게임 완료한 플레이어는 isPassed = false
        updatedGame.players[1].isPassed = false; // player2
        updatedGame.players[2].isPassed = false; // player3
        updatedGame.players[3].isPassed = false; // player4
        updatedGame.finishedPlayers = ['player1']; // player1은 게임 완료
        updatedGame.playerStats = {
          player1: { nickname: 'Player1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: 'Player2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: 'Player3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: 'Player4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player2가 패스 시도 - 성공해야 함 (player1은 finishedPlayers이므로 체크에서 제외)
      const passSuccess = await gameManager.passTurn(game!.roomId, 'player2');
      expect(passSuccess).toBe(true);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.players[1].isPassed).toBe(true); // player2가 패스했음
      expect(resultGame?.currentTurn).toBe('player3'); // 다음 턴으로 넘어감
    });

    it('게임 완료한 플레이어를 제외하고 나머지가 모두 패스하면 라운드가 넘어가야 합니다', async () => {
      // 1. 게임 상태를 준비 - 4명 중 1명이 게임 완료
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player2';
        updatedGame.lastPlay = {
          playerId: 'player1',
          cards: [{ rank: 1, isJoker: false }],
        };
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = []; // player1은 게임 완료
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[0].isPassed = false; // 게임 완료한 플레이어는 isPassed = false
        updatedGame.players[1].isPassed = false; // player2
        updatedGame.players[2].isPassed = false; // player3
        updatedGame.players[3].isPassed = false; // player4
        updatedGame.finishedPlayers = ['player1']; // player1은 게임 완료
        updatedGame.playerStats = {
          player1: { nickname: 'Player1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: 'Player2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: 'Player3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: 'Player4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player2, 3, 4가 모두 패스
      await gameManager.passTurn(game!.roomId, 'player2');
      await gameManager.passTurn(game!.roomId, 'player3');
      await gameManager.passTurn(game!.roomId, 'player4');

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.round).toBe(2); // 라운드가 변경되어야 함
      expect(resultGame?.lastPlay).toBeUndefined(); // lastPlay가 초기화되어야 함
      expect(resultGame?.players[1].isPassed).toBe(false); // player2의 isPassed가 false로 초기화
      expect(resultGame?.players[2].isPassed).toBe(false); // player3의 isPassed가 false로 초기화
      expect(resultGame?.players[3].isPassed).toBe(false); // player4의 isPassed가 false로 초기화
    });

    it('게임 완료한 플레이어가 여러 명일 때도 패스가 정상 작동해야 합니다', async () => {
      // 1. 게임 상태를 준비 - 4명 중 2명이 게임 완료
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player3';
        updatedGame.lastPlay = {
          playerId: 'player2',
          cards: [{ rank: 2, isJoker: false }],
        };
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = []; // player1은 게임 완료
        updatedGame.players[1].cards = []; // player2도 게임 완료
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[0].isPassed = false;
        updatedGame.players[1].isPassed = false;
        updatedGame.finishedPlayers = ['player1', 'player2']; // player1, 2는 게임 완료
        updatedGame.playerStats = {
          player1: { nickname: 'Player1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: 'Player2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: 'Player3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: 'Player4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player3가 패스 시도 - 성공해야 함
      const passSuccess = await gameManager.passTurn(game!.roomId, 'player3');
      expect(passSuccess).toBe(true);

      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.players[2].isPassed).toBe(true); // player3가 패스했음
      expect(resultGame?.currentTurn).toBe('player4'); // 다음 턴으로 넘어감
    });

    it('나를 제외한 모든 플레이어(완료하지 않은)가 패스했으면 패스할 수 없어야 합니다', async () => {
      // 1. 게임 상태를 준비 - 4명 중 1명이 게임 완료, 나머지 2명이 패스
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player4';
        updatedGame.lastPlay = {
          playerId: 'player1',
          cards: [{ rank: 1, isJoker: false }],
        };
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1; // player1
        updatedGame.players[1].rank = 2; // player2
        updatedGame.players[2].rank = 3; // player3
        updatedGame.players[3].rank = 4; // player4
        updatedGame.players[0].cards = []; // player1은 게임 완료
        updatedGame.players[1].cards = [{ rank: 2, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[0].isPassed = false; // 게임 완료한 플레이어
        updatedGame.players[1].isPassed = true; // player2는 패스함
        updatedGame.players[2].isPassed = true; // player3도 패스함
        updatedGame.finishedPlayers = ['player1']; // player1은 게임 완료
        updatedGame.playerStats = {
          player1: { nickname: 'Player1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: 'Player2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: 'Player3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: 'Player4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // player4가 패스 시도 - 실패해야 함 (나머지 플레이어가 모두 패스했으므로)
      const passSuccess = await gameManager.passTurn(game!.roomId, 'player4');
      expect(passSuccess).toBe(false); // 패스할 수 없음
    });

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

  describe('게임 이력 저장', () => {
    it('게임이 종료되고 모든 플레이어가 찬성하면 게임 이력이 저장되어야 합니다', async () => {
      // 1. 게임 생성 및 플레이어 참가
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 2. 게임 시작
      await gameManager.startGame(game!.roomId);

      // 3. 역할 선택
      await gameManager.selectRole(game!.roomId, ownerId, 1);
      await gameManager.selectRole(game!.roomId, 'player2', 2);
      await gameManager.selectRole(game!.roomId, 'player3', 3);
      await gameManager.selectRole(game!.roomId, 'player4', 4);

      // 4. 카드 선택
      await gameManager.selectDeck(game!.roomId, ownerId, 0);
      await gameManager.selectDeck(game!.roomId, 'player2', 1);
      await gameManager.selectDeck(game!.roomId, 'player3', 2);
      await gameManager.selectDeck(game!.roomId, 'player4', 3);

      // 5. 게임 종료 상태로 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.isVoting = true;
        updatedGame.finishedPlayers = ['player1', 'player2', 'player3', 'player4'];
        updatedGame.round = 5; // 5라운드 진행했다고 가정
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 6. 초기 상태 확인
      expect(updatedGame?.gameNumber).toBe(1);
      expect(updatedGame?.gameHistories).toHaveLength(0);

      // 7. 모든 플레이어가 찬성 투표
      await gameManager.vote(game!.roomId, ownerId, true);
      await gameManager.vote(game!.roomId, 'player2', true);
      await gameManager.vote(game!.roomId, 'player3', true);
      await gameManager.vote(game!.roomId, 'player4', true);

      // 8. 게임 이력이 저장되었는지 확인
      const finalGame = await mockDb.getGame(game!.roomId);
      expect(finalGame?.gameHistories).toHaveLength(1);
      expect(finalGame?.gameNumber).toBe(2); // 게임 번호가 증가했는지 확인

      // 9. 저장된 이력 내용 확인
      const history = finalGame?.gameHistories[0];
      expect(history?.gameNumber).toBe(1);
      expect(history?.players).toHaveLength(4);
      expect(history?.finishedOrder).toEqual(['player1', 'player2', 'player3', 'player4']);
      expect(history?.totalRounds).toBe(5);
      expect(history?.players[0].rank).toBe(1); // 첫 번째 완료한 플레이어가 1등
      expect(history?.players[0].playerId).toBe('player1');
    });

    it('플레이 기록이 roundPlays에 저장되어야 합니다', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player1';
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1;
        updatedGame.players[1].rank = 2;
        updatedGame.players[2].rank = 3;
        updatedGame.players[3].rank = 4;
        updatedGame.players[0].cards = [
          { rank: 1, isJoker: false },
          { rank: 2, isJoker: false },
        ];
        updatedGame.players[1].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 5, isJoker: false }];
        // playerStats 초기화
        updatedGame.playerStats = {
          player1: { nickname: '플레이어1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: '플레이어2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: '플레이어3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: '플레이어4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        updatedGame.roundPlays = [];
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 2. 카드 플레이
      await gameManager.playCard(game!.roomId, 'player1', [{ rank: 1, isJoker: false }]);

      // 3. roundPlays가 기록되었는지 확인
      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.roundPlays).toHaveLength(1);
      expect(resultGame?.roundPlays[0].round).toBe(1);
      expect(resultGame?.roundPlays[0].playerId).toBe('player1');
      expect(resultGame?.roundPlays[0].cards).toEqual([{ rank: 1, isJoker: false }]);

      // 4. playerStats가 업데이트되었는지 확인
      expect(resultGame?.playerStats['player1'].totalCardsPlayed).toBe(1);
    });

    it('패스 횟수가 playerStats에 기록되어야 합니다', async () => {
      // 1. 게임 상태를 준비
      const ownerId = 'player1';
      const game = await gameManager.createGame(ownerId, 'Player1');
      await gameManager.joinGame(game!.roomId, 'player2', 'Player2');
      await gameManager.joinGame(game!.roomId, 'player3', 'Player3');
      await gameManager.joinGame(game!.roomId, 'player4', 'Player4');

      // 강제로 phase, rank, cards 설정
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'playing';
        updatedGame.currentTurn = 'player1';
        updatedGame.lastPlay = { playerId: 'player2', cards: [{ rank: 1, isJoker: false }] };
        updatedGame.round = 1;
        updatedGame.players[0].rank = 1;
        updatedGame.players[1].rank = 2;
        updatedGame.players[2].rank = 3;
        updatedGame.players[3].rank = 4;
        updatedGame.players[0].cards = [{ rank: 2, isJoker: false }];
        updatedGame.players[1].cards = [{ rank: 3, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 4, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 5, isJoker: false }];
        updatedGame.playerStats = {
          player1: { nickname: '플레이어1', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player2: { nickname: '플레이어2', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player3: { nickname: '플레이어3', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
          player4: { nickname: '플레이어4', totalCardsPlayed: 0, totalPasses: 0, finishedAtRound: 0 },
        };
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 2. 패스
      await gameManager.passTurn(game!.roomId, 'player1');

      // 3. playerStats가 업데이트되었는지 확인
      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.playerStats['player1'].totalPasses).toBe(1);
    });
  });

  describe('selectRevolution', () => {
    it('최하위 순위 플레이어가 대혁명을 일으켜야 합니다', async () => {
      // 1. 4명의 플레이어로 게임 생성 및 시작
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 2. revolution 페이즈로 설정 및 최하위 순위 플레이어에게 더블 조커 부여
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'revolution';
        updatedGame.players[0].rank = 4; // 최하위 순위
        updatedGame.players[1].rank = 3;
        updatedGame.players[2].rank = 2;
        updatedGame.players[3].rank = 1;
        updatedGame.players[0].hasDoubleJoker = true;
        updatedGame.players[0].cards = [
          { rank: 13, isJoker: true },
          { rank: 13, isJoker: true },
        ];
        updatedGame.currentTurn = 'owner1';
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 3. 대혁명 선택
      const success = await gameManager.selectRevolution(game!.roomId, 'owner1', true);
      expect(success).toBe(true);

      // 4. 결과 확인: 순위가 뒤집혀야 함
      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.revolutionStatus?.isRevolution).toBe(true);
      expect(resultGame?.revolutionStatus?.isGreatRevolution).toBe(true);
      expect(resultGame?.revolutionStatus?.revolutionPlayerId).toBe('owner1');
      expect(resultGame?.players[0].rank).toBe(1); // 4 -> 1
      expect(resultGame?.players[1].rank).toBe(2); // 3 -> 2
      expect(resultGame?.players[2].rank).toBe(3); // 2 -> 3
      expect(resultGame?.players[3].rank).toBe(4); // 1 -> 4
      expect(resultGame?.phase).toBe('playing');
    });

    it('최하위가 아닌 플레이어가 일반 혁명을 일으켜야 합니다', async () => {
      // 1. 4명의 플레이어로 게임 생성
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 2. revolution 페이즈로 설정 및 2위 플레이어에게 더블 조커 부여
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'revolution';
        updatedGame.players[0].rank = 2; // 2위
        updatedGame.players[1].rank = 3;
        updatedGame.players[2].rank = 1;
        updatedGame.players[3].rank = 4;
        updatedGame.players[0].hasDoubleJoker = true;
        updatedGame.players[0].cards = [
          { rank: 13, isJoker: true },
          { rank: 13, isJoker: true },
        ];
        updatedGame.currentTurn = 'owner1';
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 3. 일반 혁명 선택
      const success = await gameManager.selectRevolution(game!.roomId, 'owner1', true);
      expect(success).toBe(true);

      // 4. 결과 확인: 순위는 유지되어야 함
      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.revolutionStatus?.isRevolution).toBe(true);
      expect(resultGame?.revolutionStatus?.isGreatRevolution).toBe(false);
      expect(resultGame?.revolutionStatus?.revolutionPlayerId).toBe('owner1');
      expect(resultGame?.players[0].rank).toBe(2); // 순위 유지
      expect(resultGame?.players[1].rank).toBe(3);
      expect(resultGame?.players[2].rank).toBe(1);
      expect(resultGame?.players[3].rank).toBe(4);
      expect(resultGame?.phase).toBe('playing');
    });

    it('혁명을 거부하면 순위가 그대로 유지되고 자동으로 세금 교환이 수행되어야 합니다', async () => {
      // 1. 4명의 플레이어로 게임 생성
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');
      for (let i = 1; i < 4; i++) {
        await gameManager.joinGame(game!.roomId, `player${i}`, `Player${i}`);
      }

      // 2. revolution 페이즈로 설정 및 더블 조커 부여, 카드 추가
      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'revolution';
        updatedGame.players[0].rank = 3;
        updatedGame.players[1].rank = 2;
        updatedGame.players[2].rank = 4;
        updatedGame.players[3].rank = 1;
        updatedGame.players[0].hasDoubleJoker = true;
        updatedGame.players[0].cards = [
          { rank: 13, isJoker: true },
          { rank: 13, isJoker: true },
        ];
        // 각 플레이어에게 테스트용 카드 추가
        updatedGame.players[0].cards.push({ rank: 5, isJoker: false }, { rank: 7, isJoker: false });
        updatedGame.players[1].cards = [{ rank: 8, isJoker: false }, { rank: 9, isJoker: false }];
        updatedGame.players[2].cards = [{ rank: 1, isJoker: false }, { rank: 2, isJoker: false }];
        updatedGame.players[3].cards = [{ rank: 11, isJoker: false }, { rank: 12, isJoker: false }];
        updatedGame.currentTurn = 'owner1';
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      // 3. 혁명 거부
      const success = await gameManager.selectRevolution(game!.roomId, 'owner1', false);
      expect(success).toBe(true);

      // 4. 결과 확인: 순위 그대로 유지, 조커 2장 사실 숨김, 세금 자동 교환
      const resultGame = await mockDb.getGame(game!.roomId);
      expect(resultGame?.players[0].rank).toBe(3); // 순위 유지
      expect(resultGame?.players[1].rank).toBe(2);
      expect(resultGame?.players[2].rank).toBe(4);
      expect(resultGame?.players[3].rank).toBe(1);
      expect(resultGame?.players[0].hasDoubleJoker).toBeUndefined(); // hasDoubleJoker 플래그 제거됨
      expect(resultGame?.phase).toBe('tax'); // 세금 교환 결과 표시를 위해 tax 페이즈
      expect(resultGame?.taxExchanges).toBeDefined();
      expect(resultGame?.taxExchanges?.length).toBe(2); // 4명이므로 2개의 교환 (4위→1위, 1위→4위)
      expect(resultGame?.revolutionStatus).toBeUndefined(); // 혁명 정보 없음 (조커 2장 사실 숨김)

      // 5. 세금 교환이 제대로 수행되었는지 확인
      const exchanges = resultGame?.taxExchanges;
      expect(exchanges).toBeDefined();
      if (exchanges) {
        // 4위 → 1위 교환 확인
        const lowToHigh = exchanges.find(
          (ex) => ex.fromPlayerId === 'player2' && ex.toPlayerId === 'player3'
        );
        expect(lowToHigh).toBeDefined();
        expect(lowToHigh?.cardsGiven.length).toBe(2);

        // 1위 → 4위 교환 확인
        const highToLow = exchanges.find(
          (ex) => ex.fromPlayerId === 'player3' && ex.toPlayerId === 'player2'
        );
        expect(highToLow).toBeDefined();
        expect(highToLow?.cardsGiven.length).toBe(2);
      }
    });

    it('잘못된 페이즈에서는 혁명을 선택할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      const success = await gameManager.selectRevolution(game!.roomId, 'owner1', true);
      expect(success).toBe(false);
    });

    it('더블 조커가 없는 플레이어는 혁명을 선택할 수 없어야 합니다', async () => {
      const ownerId = 'owner1';
      const game = await gameManager.createGame(ownerId, 'Owner');

      let updatedGame = await mockDb.getGame(game!.roomId);
      if (updatedGame) {
        updatedGame.phase = 'revolution';
        updatedGame.currentTurn = 'owner1';
        updatedGame.players[0].hasDoubleJoker = false;
        await mockDb.updateGame(game!.roomId, updatedGame);
      }

      const success = await gameManager.selectRevolution(game!.roomId, 'owner1', true);
      expect(success).toBe(false);
    });
  });

});
