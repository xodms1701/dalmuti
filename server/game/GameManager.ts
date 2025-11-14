/* eslint-disable no-param-reassign, no-console, no-shadow, no-return-assign, no-plusplus */
import { Server } from 'socket.io';
import { Card, Game, Player, RoleSelectionCard, Database, GameHistory } from '../types';
import { SocketEvent } from '../socket/events';
import {
  validateGameExists,
  validatePhase,
  validatePlayer,
  validateTurn,
  validateNotFinished,
  validatePlayerHasCards,
  validateCardCount,
  validateCardsStrongerThanLast,
  validateSameRank,
  validateDeckIndex,
  validateDeckNotSelected,
  validateRoleNumber,
} from './helpers/GameValidator';
import {
  findNextPlayer,
  getLastActivePlayer,
  allPlayersPassedExceptLast,
  startNewRound,
  getSortedPlayers,
} from './helpers/TurnHelper';
import {
  incrementCardsPlayed,
  setFinishedAtRound,
  incrementPasses,
  initializeAllPlayerStats,
} from './helpers/PlayerStatsHelper';
import { createSelectableDecks } from './helpers/DeckHelper';

export default class GameManager {
  private readonly MIN_PLAYERS = 4;

  private readonly MAX_PLAYERS = 8;

  private db: Database;

  private io: Server;

  constructor(db: Database, io: Server) {
    this.db = db;
    this.io = io;
  }

  public async createGame(ownerId: string, nickname: string): Promise<Game | null> {
    const game: Game = {
      roomId: this.generateroomId(),
      ownerId,
      players: [
        {
          id: ownerId,
          nickname,
          cards: [],
          role: null,
          rank: null,
          isPassed: false,
          isReady: true,
        },
      ],
      phase: 'waiting',
      currentTurn: null,
      lastPlay: undefined,
      deck: [],
      round: 1,
      roleSelectionDeck: [],
      selectableDecks: [],
      isVoting: false,
      votes: {},
      nextGameVotes: {},
      finishedPlayers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      gameNumber: 1,
      gameHistories: [],
      currentGameStartedAt: undefined,
      playerStats: {},
      roundPlays: [],
    };

    return this.db.createGame(game);
  }

  public async joinGame(roomId: string, playerId: string, nickname: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game) {
      return false;
    }

    if (game.players.length >= this.MAX_PLAYERS || game.phase !== 'waiting') {
      return false;
    }

    const player: Player = {
      id: playerId,
      nickname,
      cards: [],
      role: null,
      rank: null,
      isPassed: false,
      isReady: false,
    };

    game.players.push(player);

    await this.db.updateGame(roomId, {
      players: game.players,
    });

    return true;
  }

  public async leaveGame(roomId: string, playerId: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game) {
      return false;
    }

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return false;
    }

    game.players.splice(playerIndex, 1);

    if (game.ownerId === playerId && game.players.length > 0) {
      game.ownerId = game.players[0].id;
    }

    if (game.players.length === 0) {
      await this.db.deleteGame(roomId);
    } else {
      await this.db.updateGame(roomId, {
        players: game.players,
        ownerId: game.ownerId,
      });
    }

    return true;
  }

  public async startGame(roomId: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return false;
    const validGame = gameResult.data;

    if (
      validGame.players.length < this.MIN_PLAYERS ||
      validGame.players.length > this.MAX_PLAYERS
    ) {
      return false;
    }

    validGame.phase = 'roleSelection';
    this.initializeDeck(validGame);
    validGame.roleSelectionDeck = this.initializeRoleSelectionDeck();
    validGame.currentGameStartedAt = new Date();

    // 플레이어별 통계 초기화
    this.resetGameStatsAndPlays(validGame);

    await this.db.updateGame(roomId, {
      phase: validGame.phase,
      deck: validGame.deck,
      roleSelectionDeck: validGame.roleSelectionDeck,
      currentGameStartedAt: validGame.currentGameStartedAt,
      playerStats: validGame.playerStats,
      roundPlays: validGame.roundPlays,
    });

    return true;
  }

  public async getGameState(roomId: string): Promise<Game | null> {
    return this.db.getGame(roomId);
  }

  public async playCard(roomId: string, playerId: string, cards: Card[]): Promise<Game | null> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return null;
    const validGame = gameResult.data;

    // Phase 확인 (playCard는 playing 페이즈에서만 가능)
    const phaseResult = validatePhase(validGame, 'playing', '카드 내기');
    if (!phaseResult.success) return validGame;

    // 게임이 이미 종료되었는지 확인
    if (validGame.finishedPlayers.length === validGame.players.length) return validGame;

    // 플레이어 존재 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return validGame;
    const player = playerResult.data;

    // 턴 확인
    const turnResult = validateTurn(validGame, playerId);
    if (!turnResult.success) return validGame;

    // 게임 완료 여부 확인
    const finishedResult = validateNotFinished(validGame, playerId);
    if (!finishedResult.success) return validGame;

    // 카드가 플레이어의 손에 있는지 확인
    const hasCardsResult = validatePlayerHasCards(player, cards);
    if (!hasCardsResult.success) return validGame;

    // 카드 개수 확인 (이전 플레이와 같은 개수여야 함)
    const cardCountResult = validateCardCount(cards, validGame.lastPlay);
    if (!cardCountResult.success) return validGame;

    // 카드 강도 확인 (이전 플레이보다 낮은 숫자여야 함)
    const cardStrengthResult = validateCardsStrongerThanLast(cards, validGame.lastPlay);
    if (!cardStrengthResult.success) return validGame;

    // 같은 숫자의 카드만 낼 수 있는지 확인
    const sameRankResult = validateSameRank(cards);
    if (!sameRankResult.success) return validGame;

    // 카드를 플레이
    const playedCards: Card[] = [];
    for (const card of cards) {
      const idx = player.cards.findIndex((c) => c.rank === card.rank && c.isJoker === card.isJoker);
      if (idx !== -1) {
        playedCards.push(player.cards.splice(idx, 1)[0]);
      }
    }
    // 모든 플레이어의 isPassed를 false로 초기화
    validGame.players.forEach((p) => (p.isPassed = false));
    validGame.lastPlay = {
      playerId,
      cards: playedCards,
    };

    // 플레이 기록 저장
    validGame.roundPlays.push({
      round: validGame.round,
      playerId,
      cards: playedCards,
      timestamp: new Date(),
    });

    // 플레이어 통계 업데이트
    incrementCardsPlayed(validGame, playerId, player, playedCards.length);

    // 플레이어의 카드가 모두 소진되었는지 확인
    if (player.cards.length === 0) {
      // 플레이어를 완료 목록에 추가
      if (!validGame.finishedPlayers.includes(playerId)) {
        validGame.finishedPlayers.push(playerId);
        // 카드를 소진한 라운드 기록
        setFinishedAtRound(validGame, playerId, player, validGame.round);
      }

      // 모든 플레이어의 카드가 소진되었는지 확인
      if (validGame.finishedPlayers.length === validGame.players.length) {
        // 모든 플레이어의 카드가 소진되었으므로 게임 종료
        validGame.isVoting = true;
        validGame.votes = {};
        validGame.nextGameVotes = {};
      } else {
        // 손에 카드가 남은 사람이 한 명만 남았는지 확인
        const lastPlayer = getLastActivePlayer(validGame);
        if (lastPlayer) {
          // 마지막 한 명도 자동으로 완료 처리
          validGame.finishedPlayers.push(lastPlayer.id);
          validGame.isVoting = true;
          validGame.votes = {};
          validGame.nextGameVotes = {};
        } else {
          // 다음 턴으로 넘어감
          validGame.currentTurn = findNextPlayer(validGame, playerId);
        }
      }
    } else {
      // 다음 턴으로 넘어감
      validGame.currentTurn = findNextPlayer(validGame, playerId);
    }

    await this.db.updateGame(roomId, {
      players: validGame.players,
      currentTurn: validGame.currentTurn,
      lastPlay: validGame.lastPlay,
      round: validGame.round,
      phase: validGame.phase,
      finishedPlayers: validGame.finishedPlayers,
      isVoting: validGame.isVoting,
      roundPlays: validGame.roundPlays,
      playerStats: validGame.playerStats,
    });

    return validGame;
  }

  public async passTurn(roomId: string, playerId: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return false;
    const validGame = gameResult.data;

    // Phase 및 턴 확인
    const phaseResult = validatePhase(validGame, 'playing', '패스');
    if (!phaseResult.success) return false;

    const turnResult = validateTurn(validGame, playerId);
    if (!turnResult.success) return false;

    // 플레이어 존재 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return false;
    const currentPlayer = playerResult.data;

    // 아직 아무도 카드를 내지 않은 라운드에서는 패스 불가능 (첫 턴)
    if (!validGame.lastPlay) {
      return false;
    }

    // 나를 제외한 다른 플레이어들이 모두 패스했는지 확인
    const otherPlayersAllPassed = validGame.players
      .filter((p) => p.id !== playerId)
      .every((p) => p.isPassed);

    if (otherPlayersAllPassed) {
      return false; // 다른 플레이어들이 모두 패스했다면 패스 불가능
    }

    currentPlayer.isPassed = true;

    // 패스 횟수 기록
    incrementPasses(validGame, playerId, currentPlayer);

    // 모든 플레이어가 패스했는지 확인
    if (allPlayersPassedExceptLast(validGame)) {
      // 새로운 라운드 시작
      const roundUpdates = startNewRound(validGame);
      validGame.round = roundUpdates.round;
      validGame.lastPlay = roundUpdates.lastPlay;
      validGame.currentTurn = roundUpdates.currentTurn;
    } else {
      // 다음 플레이어로 턴 넘김
      validGame.currentTurn = findNextPlayer(validGame, playerId);
    }

    await this.db.updateGame(roomId, {
      players: validGame.players,
      currentTurn: validGame.currentTurn,
      round: validGame.round,
      lastPlay: validGame.lastPlay,
      playerStats: validGame.playerStats,
    });

    return true;
  }

  public async selectRole(roomId: string, playerId: string, roleNumber: number): Promise<boolean> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return false;
    const validGame = gameResult.data;

    // Phase 확인
    const phaseResult = validatePhase(validGame, 'roleSelection', '역할 선택');
    if (!phaseResult.success) return false;

    // 역할 번호 유효성 확인 (1-13 범위)
    const roleNumberResult = validateRoleNumber(roleNumber);
    if (!roleNumberResult.success) return false;

    // 플레이어 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return false;
    const player = playerResult.data;

    // 플레이어가 이미 역할을 선택했는지 확인
    if (player.role !== null) {
      return false;
    }

    const roleSelectionCard = validGame.roleSelectionDeck.find((r) => r.number === roleNumber);
    if (!roleSelectionCard || roleSelectionCard.isSelected) {
      return false;
    }

    roleSelectionCard.isSelected = true;
    roleSelectionCard.selectedBy = playerId;
    player.role = roleSelectionCard.number;

    const allPlayersHaveRole = validGame.players.every((p) => p.role !== null);
    if (allPlayersHaveRole) {
      const sortedPlayers = getSortedPlayers(validGame.players);
      sortedPlayers.forEach((p, index) => {
        p.rank = index + 1;
      });

      // 자동으로 카드 섞기 및 배분
      this.initializeDeck(validGame);
      this.shuffleDeck(validGame);

      // 개발 환경에서 테스트를 위한 백도어: 조커 2장을 첫 번째 구간으로 이동
      if (process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_BACKDOOR === 'true') {
        console.log('[TEST BACKDOOR] Moving 2 jokers to first deck positions');

        const jokerIndices: number[] = [];
        validGame.deck.forEach((card, index) => {
          if (card.isJoker) jokerIndices.push(index);
        });

        // 조커 2장을 0, 1 위치와 교환
        if (jokerIndices.length >= 2) {
          // 첫 번째 조커를 0번 위치로
          if (jokerIndices[0] !== 0) {
            [validGame.deck[0], validGame.deck[jokerIndices[0]]] = [
              validGame.deck[jokerIndices[0]],
              validGame.deck[0],
            ];
          }

          // 두 번째 조커를 1번 위치로
          const secondJokerIndex = jokerIndices[1];
          if (secondJokerIndex !== 1) {
            [validGame.deck[1], validGame.deck[secondJokerIndex]] = [
              validGame.deck[secondJokerIndex],
              validGame.deck[1],
            ];
          }

          console.log('[TEST BACKDOOR] Jokers placed at positions 0 and 1');
        }
      }

      // 플레이어 수에 맞게 각 플레이어가 선택할 수 있는 덱 생성
      validGame.players.forEach((player) => {
        player.cards = [];
      });

      validGame.selectableDecks = createSelectableDecks(validGame.deck, validGame.players.length);

      // rank가 낮을수록 높은 순위이므로 오름차순 정렬
      const rankedPlayers = getSortedPlayers(validGame.players);

      // 카드 선택 단계로 전환
      validGame.phase = 'cardSelection';
      validGame.currentTurn = rankedPlayers[0].id; // 가장 높은 순위의 플레이어부터 시작
    }

    await this.db.updateGame(roomId, {
      players: validGame.players,
      roleSelectionDeck: validGame.roleSelectionDeck,
      phase: validGame.phase,
      deck: validGame.deck,
      currentTurn: validGame.currentTurn,
      selectableDecks: validGame.selectableDecks,
    });

    return true;
  }

  public async selectDeck(roomId: string, playerId: string, cardIndex: number): Promise<boolean> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return false;
    const validGame = gameResult.data;

    // Phase 확인
    const phaseResult = validatePhase(validGame, 'cardSelection', '덱 선택');
    if (!phaseResult.success) return false;

    // 턴 확인
    const turnResult = validateTurn(validGame, playerId);
    if (!turnResult.success) return false;

    // 플레이어 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return false;
    const player = playerResult.data;

    // 덱 인덱스 확인
    const deckIndexResult = validateDeckIndex(validGame, cardIndex);
    if (!deckIndexResult.success) return false;

    // 카드 선택
    const selectedCard = validGame.selectableDecks[cardIndex];

    // 덱이 이미 선택되지 않았는지 확인
    const deckSelectedResult = validateDeckNotSelected(validGame, cardIndex);
    if (!deckSelectedResult.success) return false;

    selectedCard.isSelected = true;
    selectedCard.selectedBy = playerId;
    player.cards.push(...selectedCard.cards);

    // 남은 덱이 1개인지 확인 (마지막 플레이어 자동 선택)
    const remainingDecks = validGame.selectableDecks.filter((deck) => !deck.isSelected);

    // rank가 낮을수록 높은 순위이므로 오름차순 정렬
    const sortedPlayers = getSortedPlayers(validGame.players);

    // 다음 플레이어 찾기
    const currentPlayerIndex = sortedPlayers.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;

    if (remainingDecks.length === 1) {
      const nextPlayer = sortedPlayers[nextPlayerIndex];
      const lastDeck = remainingDecks[0];

      lastDeck.isSelected = true;
      lastDeck.selectedBy = nextPlayer.id;
      nextPlayer.cards.push(...lastDeck.cards);

      // 모든 덱이 선택되었으므로 1등(rank가 가장 낮은 플레이어)으로 턴 설정
      // 조커 2장 로직에서 변경될 수 있음
      validGame.currentTurn = sortedPlayers[0].id;
    } else {
      // 남은 덱이 2개 이상이면 다음 플레이어로 턴 넘기기
      validGame.currentTurn = sortedPlayers[nextPlayerIndex].id;
    }

    // 모든 카드가 배분되었는지 확인
    const allDecksSelected = validGame.selectableDecks.every((deck) => deck.isSelected);
    if (allDecksSelected) {
      // 조커 2장을 받은 플레이어 찾기
      const doubleJokerPlayer = validGame.players.find(
        (p) => p.cards.filter((card) => card.isJoker).length === 2
      );

      if (doubleJokerPlayer) {
        // 조커 2장 보유자 표시
        doubleJokerPlayer.hasDoubleJoker = true;
        // 혁명 선택 페이즈로 전환
        validGame.phase = 'revolution';
        validGame.currentTurn = doubleJokerPlayer.id;
      } else {
        // 조커 2장이 없으면 세금 페이즈로
        validGame.phase = 'tax';
        // 세금 교환 초기화
        this.initializeTaxExchanges(validGame);
      }
    }

    const hasNoDoubleJoker =
      allDecksSelected &&
      !validGame.players.some((p) => p.cards.filter((card) => card.isJoker).length === 2);

    await this.db.updateGame(roomId, {
      players: validGame.players,
      phase: validGame.phase,
      deck: validGame.deck,
      currentTurn: validGame.currentTurn,
      lastPlay: validGame.lastPlay,
      round: validGame.round,
      selectableDecks: validGame.selectableDecks,
      taxExchanges: validGame.taxExchanges,
    });

    // 더블조커가 없는 경우 10초 후 playing 페이즈로 전환
    if (hasNoDoubleJoker) {
      setTimeout(async () => {
        const updatedGame = await this.db.getGame(roomId);
        if (!updatedGame || updatedGame.phase !== 'tax') {
          return;
        }

        updatedGame.phase = 'playing';
        await this.db.updateGame(roomId, {
          phase: updatedGame.phase,
        });

        // 클라이언트에게 업데이트된 게임 상태 전송
        const finalGameState = await this.db.getGame(roomId);
        this.io.to(roomId).emit(SocketEvent.GAME_STATE_UPDATED, finalGameState);
      }, 10000);
    }

    return true;
  }

  public async setPlayerReady(roomId: string, playerId: string): Promise<Game | null> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return null;
    const validGame = gameResult.data;

    // 플레이어 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return null;

    const playerIndex = validGame.players.findIndex((p) => p.id === playerId);

    const updatedPlayers = [...validGame.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      isReady: true,
    };

    return this.db.updateGame(roomId, {
      players: updatedPlayers,
    });
  }

  public async vote(roomId: string, playerId: string, vote: boolean): Promise<Game | null> {
    const game = await this.db.getGame(roomId);
    if (!game || !game.isVoting) {
      return null;
    }

    game.votes[playerId] = vote;
    await this.db.updateGame(roomId, {
      votes: game.votes,
    });

    // 모든 플레이어가 투표했는지 확인
    const allVoted = game.players.every((p) => game.votes[p.id] !== undefined);
    if (allVoted) {
      // 모든 플레이어가 찬성했는지 확인
      const allAgreed = Object.values(game.votes).every((v) => v);

      if (allAgreed) {
        // 현재 게임 이력 저장
        const gameHistory: GameHistory = {
          gameNumber: game.gameNumber,
          players: game.finishedPlayers.map((playerId, index) => {
            const player = game.players.find((p) => p.id === playerId);
            const stats = game.playerStats[playerId] || {
              nickname: player?.nickname || '',
              totalCardsPlayed: 0,
              totalPasses: 0,
              finishedAtRound: 0,
            };
            return {
              playerId,
              nickname: stats.nickname,
              rank: index + 1,
              finishedAtRound: stats.finishedAtRound,
              totalCardsPlayed: stats.totalCardsPlayed,
              totalPasses: stats.totalPasses,
            };
          }),
          finishedOrder: [...game.finishedPlayers],
          totalRounds: game.round,
          roundPlays: [...game.roundPlays],
          startedAt: game.currentGameStartedAt || new Date(),
          endedAt: new Date(),
        };

        game.gameHistories.push(gameHistory);

        // finishedPlayers 순서대로 계급 재배정
        game.finishedPlayers.forEach((playerId, index) => {
          const player = game.players.find((p) => p.id === playerId);
          if (player) {
            player.rank = index + 1;
          }
        });

        // 게임 번호 증가
        game.gameNumber++;

        // 게임 상태 초기화
        game.lastPlay = undefined;
        game.round = 1;
        game.roleSelectionDeck = this.initializeRoleSelectionDeck();
        game.isVoting = false;
        game.votes = {};
        game.finishedPlayers = [];
        game.currentGameStartedAt = new Date();

        // 플레이어별 통계 초기화
        this.resetGameStatsAndPlays(game);

        // 각 플레이어의 카드 초기화
        game.players.forEach((player) => {
          player.cards = [];
        });

        // 먼저 roleSelectionComplete 단계로 전환하여 순위 확인 화면 표시
        game.phase = 'roleSelectionComplete';

        await this.db.updateGame(roomId, {
          players: game.players,
          phase: game.phase,
          lastPlay: game.lastPlay,
          round: game.round,
          roleSelectionDeck: game.roleSelectionDeck,
          isVoting: game.isVoting,
          votes: game.votes,
          finishedPlayers: game.finishedPlayers,
          gameHistories: game.gameHistories,
          gameNumber: game.gameNumber,
          playerStats: game.playerStats,
          roundPlays: game.roundPlays,
          currentGameStartedAt: game.currentGameStartedAt,
        });

        // 5초 후 카드 섞기 및 배분
        setTimeout(async () => {
          // 게임 상태 다시 가져오기 (혹시 변경되었을 수 있으므로)
          const updatedGame = await this.db.getGame(roomId);
          if (!updatedGame || updatedGame.phase !== 'roleSelectionComplete') {
            return;
          }

          // 자동으로 카드 섞기 및 배분
          this.initializeDeck(updatedGame);
          this.shuffleDeck(updatedGame);

          // 플레이어 수에 맞게 각 플레이어가 선택할 수 있는 덱 생성
          updatedGame.selectableDecks = createSelectableDecks(
            updatedGame.deck,
            updatedGame.players.length
          );

          // rank가 낮을수록 높은 순위이므로 오름차순 정렬
          const rankedPlayers = [...updatedGame.players].sort(
            (a, b) => (a.rank || 0) - (b.rank || 0)
          );

          // 카드 선택 단계로 전환
          updatedGame.phase = 'cardSelection';
          updatedGame.currentTurn = rankedPlayers[0].id; // 가장 높은 순위의 플레이어부터 시작

          await this.db.updateGame(roomId, {
            players: updatedGame.players,
            phase: updatedGame.phase,
            currentTurn: updatedGame.currentTurn,
            deck: updatedGame.deck,
            selectableDecks: updatedGame.selectableDecks,
            playerStats: updatedGame.playerStats,
            roundPlays: updatedGame.roundPlays,
          });

          // 클라이언트에게 업데이트된 게임 상태 전송
          const finalGameState = await this.db.getGame(roomId);
          this.io.to(roomId).emit(SocketEvent.GAME_STATE_UPDATED, finalGameState);
        }, 5000);
      } else {
        // 게임 종료
        game.phase = 'gameEnd';
        await this.db.updateGame(roomId, {
          phase: game.phase,
        });
      }
    }

    return game;
  }

  private generateroomId(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  private initializeDeck(game: Game): void {
    game.deck = [];

    for (let number = 1; number <= 12; number++) {
      for (let i = 0; i < number; i++) {
        game.deck.push({ rank: number, isJoker: false });
      }
    }

    game.deck.push({ rank: 13, isJoker: true });
    game.deck.push({ rank: 13, isJoker: true });
  }

  private initializeRoleSelectionDeck(): RoleSelectionCard[] {
    const deck: RoleSelectionCard[] = [];
    for (let i = 1; i <= 13; i++) {
      deck.push({ number: i, isSelected: false });
    }

    // Fisher-Yates 셔플 알고리즘으로 카드 섞기
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  private shuffleDeck(game: Game): void {
    for (let i = game.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
    }
  }

  private resetGameStatsAndPlays(game: Game): void {
    game.playerStats = initializeAllPlayerStats(game.players);
    game.roundPlays = [];
  }

  public async selectRevolution(
    roomId: string,
    playerId: string,
    wantRevolution: boolean
  ): Promise<boolean> {
    const game = await this.db.getGame(roomId);

    // 게임 존재 여부 확인
    const gameResult = validateGameExists(game);
    if (!gameResult.success) return false;
    const validGame = gameResult.data;

    // Phase 확인
    const phaseResult = validatePhase(validGame, 'revolution', '혁명 선택');
    if (!phaseResult.success) return false;

    // 턴 확인
    const turnResult = validateTurn(validGame, playerId);
    if (!turnResult.success) return false;

    // 플레이어 확인
    const playerResult = validatePlayer(validGame, playerId);
    if (!playerResult.success) return false;
    const player = playerResult.data;

    // 조커 2장 확인
    if (!player.hasDoubleJoker) {
      return false;
    }

    player.revolutionChoice = wantRevolution;

    if (wantRevolution) {
      // 혁명을 일으킨다
      const playerCount = validGame.players.length;
      const isLowestRank = player.rank === playerCount;

      if (isLowestRank) {
        // 대혁명: 모든 순위 뒤집기
        validGame.players.forEach((p) => {
          if (p.rank !== null) {
            p.rank = playerCount - p.rank + 1;
          }
        });
        validGame.revolutionStatus = {
          isRevolution: true,
          isGreatRevolution: true,
          revolutionPlayerId: playerId,
        };
      } else {
        // 일반 혁명: 순위 유지
        validGame.revolutionStatus = {
          isRevolution: true,
          isGreatRevolution: false,
          revolutionPlayerId: playerId,
        };
      }

      // 혁명이 일어나면 세금 없이 바로 게임 시작
      validGame.phase = 'playing';
      validGame.lastPlay = undefined;
      validGame.round = 1;
      // 1등부터 시작
      const sortedPlayers = getSortedPlayers(validGame.players);
      validGame.currentTurn = sortedPlayers[0].id;
    } else {
      // 혁명을 일으키지 않는다 - 순위 그대로 유지, 조커 2장 사실 숨김
      // hasDoubleJoker 플래그 제거하여 조커 2장 사실 숨김
      player.hasDoubleJoker = undefined;

      // 세금 교환 수행
      this.initializeTaxExchanges(validGame);

      // 세금 교환 결과를 표시하기 위해 tax 페이즈로 설정
      validGame.phase = 'tax';
    }

    await this.db.updateGame(roomId, {
      players: validGame.players,
      phase: validGame.phase,
      currentTurn: validGame.currentTurn,
      lastPlay: validGame.lastPlay,
      round: validGame.round,
      revolutionStatus: validGame.revolutionStatus,
      taxExchanges: validGame.taxExchanges,
    });

    // 혁명을 선택하지 않은 경우 10초 후 playing 페이즈로 전환
    if (!wantRevolution) {
      setTimeout(async () => {
        const updatedGame = await this.db.getGame(roomId);
        if (!updatedGame || updatedGame.phase !== 'tax') {
          return;
        }

        updatedGame.phase = 'playing';
        await this.db.updateGame(roomId, {
          phase: updatedGame.phase,
        });

        // 클라이언트에게 업데이트된 게임 상태 전송
        const finalGameState = await this.db.getGame(roomId);
        this.io.to(roomId).emit(SocketEvent.GAME_STATE_UPDATED, finalGameState);
      }, 10000);
    }

    return true;
  }

  private initializeTaxExchanges(game: Game): void {
    const playerCount = game.players.length;
    const sortedPlayers = getSortedPlayers(game.players);

    const exchangePairs: Array<{ fromIdx: number; toIdx: number; count: number }> = [];

    if (playerCount === 4) {
      // 4명: 1위 ↔ 4위 2장씩
      exchangePairs.push(
        { fromIdx: 3, toIdx: 0, count: 2 }, // 4위 → 1위
        { fromIdx: 0, toIdx: 3, count: 2 } // 1위 → 4위
      );
    } else if (playerCount >= 5) {
      // 5명 이상: 1위 ↔ 최하위 2장씩, 2위 ↔ 차하위 1장씩
      exchangePairs.push(
        { fromIdx: playerCount - 1, toIdx: 0, count: 2 }, // 최하위 → 1위
        { fromIdx: 0, toIdx: playerCount - 1, count: 2 }, // 1위 → 최하위
        { fromIdx: playerCount - 2, toIdx: 1, count: 1 }, // 차하위 → 2위
        { fromIdx: 1, toIdx: playerCount - 2, count: 1 } // 2위 → 차하위
      );
    }

    // Step 1: 각 플레이어가 줄 카드를 미리 결정
    const cardsToGiveByPlayer = new Map<string, Card[]>();
    for (const pair of exchangePairs) {
      const fromPlayer = sortedPlayers[pair.fromIdx];
      if (!cardsToGiveByPlayer.has(fromPlayer.id)) {
        const cardsToGive = this.selectTaxCardsAutomatically(
          fromPlayer,
          pair.count,
          pair.fromIdx <= 1 // 높은 순위(1, 2등)는 큰 카드를 줌
        );
        cardsToGiveByPlayer.set(fromPlayer.id, cardsToGive);
      }
    }

    // Step 2: 모든 카드 교환 실행
    for (const pair of exchangePairs) {
      const fromPlayer = sortedPlayers[pair.fromIdx];
      const toPlayer = sortedPlayers[pair.toIdx];
      const cardsGiven = cardsToGiveByPlayer.get(fromPlayer.id) || [];

      cardsGiven.forEach((card) => {
        const index = fromPlayer.cards.findIndex(
          (c) => c.rank === card.rank && c.isJoker === card.isJoker
        );
        if (index !== -1) fromPlayer.cards.splice(index, 1);
      });
      toPlayer.cards.push(...cardsGiven);
    }

    // Step 3: UI용 교환 기록 생성
    game.taxExchanges = exchangePairs.map((pair) => {
      const fromPlayer = sortedPlayers[pair.fromIdx];
      const toPlayer = sortedPlayers[pair.toIdx];

      const cardsGiven = cardsToGiveByPlayer.get(fromPlayer.id) || [];

      return {
        fromPlayerId: fromPlayer.id,
        toPlayerId: toPlayer.id,
        cardCount: pair.count,
        cardsGiven,
      };
    });

    // Step 4: 게임 시작 준비
    game.lastPlay = undefined;
    game.round = 1;
    game.currentTurn = sortedPlayers[0].id;
  }

  private selectTaxCardsAutomatically(
    player: Player,
    count: number,
    selectLargest: boolean
  ): Card[] {
    // 조커가 아닌 카드만 필터링
    const nonJokerCards = player.cards.filter((card) => !card.isJoker);

    // 정렬: selectLargest가 true면 내림차순, false면 오름차순
    const sortedCards = [...nonJokerCards].sort((a, b) =>
      selectLargest ? b.rank - a.rank : a.rank - b.rank
    );

    // 상위 count개 선택
    return sortedCards.slice(0, count);
  }
}
