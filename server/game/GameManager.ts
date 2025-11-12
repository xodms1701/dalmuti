import { Card, Game, Player, RoleSelectionCard, Database, GameHistory } from '../types';
import { Server } from 'socket.io';
import { SocketEvent } from '../socket/events';

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
    if (!game) {
      return false;
    }

    if (game.players.length < this.MIN_PLAYERS || game.players.length > this.MAX_PLAYERS) {
      return false;
    }

    game.phase = 'roleSelection';
    this.initializeDeck(game);
    game.roleSelectionDeck = this.initializeRoleSelectionDeck();
    game.currentGameStartedAt = new Date();

    // 플레이어별 통계 초기화
    this.resetGameStatsAndPlays(game);

    await this.db.updateGame(roomId, {
      phase: game.phase,
      deck: game.deck,
      roleSelectionDeck: game.roleSelectionDeck,
      currentGameStartedAt: game.currentGameStartedAt,
      playerStats: game.playerStats,
      roundPlays: game.roundPlays,
    });

    return true;
  }

  public async getGameState(roomId: string): Promise<Game | null> {
    return this.db.getGame(roomId);
  }

  public async playCard(roomId: string, playerId: string, cards: Card[]): Promise<Game | null> {
    const game = await this.db.getGame(roomId);
    if (!game) return null;

    // 게임이 이미 종료되었는지 확인
    if (game.finishedPlayers.length === game.players.length) return game;

    // 현재 턴이 아닌 플레이어가 카드를 내려고 하는 경우
    if (game.currentTurn !== playerId) {
      return game;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return game;

    // 카드가 플레이어의 손에 있는지 확인
    const cardIndices = cards.map((card) =>
      player.cards.findIndex((c) => c.rank === card.rank && c.isJoker === card.isJoker)
    );
    if (cardIndices.some((index) => index === -1)) return game;

    // 마지막 플레이와 비교하여 유효한 카드인지 확인
    if (game.lastPlay && game.lastPlay.cards.length > 0) {
      // 1. 장수 체크
      if (cards.length !== game.lastPlay.cards.length) {
        return game;
      }
      // 2. 랭크 체크 (기존대로)
      const lastCard = game.lastPlay.cards[0];
      if (cards[0].rank >= lastCard.rank) {
        return game;
      }
    }

    // 3. 같은 숫자의 카드만 낼 수 있는지 체크
    if (cards.length > 1) {
      const firstNonJokerCard = cards.find((card) => !card.isJoker);
      if (firstNonJokerCard) {
        const firstCardRank = firstNonJokerCard.rank;
        const hasDifferentRank = cards.some((card) => !card.isJoker && card.rank !== firstCardRank);
        if (hasDifferentRank) {
          return game;
        }
      }
    }

    // 카드를 플레이
    const playedCards: Card[] = [];
    for (const card of cards) {
      const idx = player.cards.findIndex((c) => c.rank === card.rank && c.isJoker === card.isJoker);
      if (idx !== -1) {
        playedCards.push(player.cards.splice(idx, 1)[0]);
      }
    }
    // 모든 플레이어의 isPassed를 false로 초기화
    game.players.forEach((p) => (p.isPassed = false));
    game.lastPlay = {
      playerId,
      cards: playedCards,
    };

    // 플레이 기록 저장
    game.roundPlays.push({
      round: game.round,
      playerId,
      cards: playedCards,
      timestamp: new Date(),
    });

    // 플레이어 통계 업데이트 (테스트에서 강제로 상태를 설정하는 경우를 대비)
    if (!game.playerStats[playerId]) {
      game.playerStats[playerId] = {
        totalCardsPlayed: 0,
        totalPasses: 0,
        finishedAtRound: 0,
      };
    }
    game.playerStats[playerId].totalCardsPlayed += playedCards.length;

    // 플레이어의 카드가 모두 소진되었는지 확인
    if (player.cards.length === 0) {
      // 플레이어를 완료 목록에 추가
      if (!game.finishedPlayers.includes(playerId)) {
        game.finishedPlayers.push(playerId);
        // 카드를 소진한 라운드 기록
        game.playerStats[playerId].finishedAtRound = game.round;
      }

      // 모든 플레이어의 카드가 소진되었는지 확인
      if (game.finishedPlayers.length === game.players.length) {
        // 모든 플레이어의 카드가 소진되었으므로 게임 종료
        game.isVoting = true;
        game.votes = {};
        game.nextGameVotes = {};
      } else {
        // 손에 카드가 남은 사람이 한 명만 남았는지 확인
        const notFinished = game.players.filter(
          (p) => !game.finishedPlayers.includes(p.id) && p.cards.length > 0
        );
        if (notFinished.length === 1) {
          // 마지막 한 명도 자동으로 완료 처리
          const lastPlayer = notFinished[0];
          game.finishedPlayers.push(lastPlayer.id);
          game.isVoting = true;
          game.votes = {};
          game.nextGameVotes = {};
        } else {
          // 다음 턴으로 넘어감 (rank 기준 정렬)
          const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));
          const currentPlayerIndex = sortedPlayers.findIndex((p) => p.id === playerId);
          let nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
          // 카드가 있는 플레이어를 찾을 때까지 다음 플레이어로 이동
          while (
            sortedPlayers[nextPlayerIndex].cards.length === 0 ||
            game.finishedPlayers.includes(sortedPlayers[nextPlayerIndex].id)
          ) {
            nextPlayerIndex = (nextPlayerIndex + 1) % sortedPlayers.length;
            if (nextPlayerIndex === currentPlayerIndex) break;
          }
          game.currentTurn = sortedPlayers[nextPlayerIndex].id;
        }
      }
    } else {
      // 다음 턴으로 넘어감 (rank 기준 정렬)
      const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));
      const currentPlayerIndex = sortedPlayers.findIndex((p) => p.id === playerId);
      let nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
      // 카드가 있는 플레이어를 찾을 때까지 다음 플레이어로 이동
      while (
        sortedPlayers[nextPlayerIndex].cards.length === 0 ||
        game.finishedPlayers.includes(sortedPlayers[nextPlayerIndex].id)
      ) {
        nextPlayerIndex = (nextPlayerIndex + 1) % sortedPlayers.length;
        if (nextPlayerIndex === currentPlayerIndex) break;
      }
      game.currentTurn = sortedPlayers[nextPlayerIndex].id;
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      currentTurn: game.currentTurn,
      lastPlay: game.lastPlay,
      round: game.round,
      phase: game.phase,
      finishedPlayers: game.finishedPlayers,
      isVoting: game.isVoting,
      roundPlays: game.roundPlays,
      playerStats: game.playerStats,
    });

    return game;
  }

  public async passTurn(roomId: string, playerId: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game) {
      return false;
    }

    if (game.phase !== 'playing' || playerId !== game.currentTurn) {
      return false;
    }

    const currentPlayer = game.players.find((p) => p.id === playerId);
    if (!currentPlayer) {
      return false;
    }

    // 나를 제외한 다른 플레이어들이 모두 패스했는지 확인
    const otherPlayersAllPassed = game.players
      .filter((p) => p.id !== playerId)
      .every((p) => p.isPassed);

    if (otherPlayersAllPassed) {
      return false; // 다른 플레이어들이 모두 패스했다면 패스 불가능
    }

    currentPlayer.isPassed = true;

    // 패스 횟수 기록 (테스트에서 강제로 상태를 설정하는 경우를 대비)
    if (!game.playerStats[playerId]) {
      game.playerStats[playerId] = {
        totalCardsPlayed: 0,
        totalPasses: 0,
        finishedAtRound: 0,
      };
    }
    game.playerStats[playerId].totalPasses++;

    // 순위 순서대로 정렬된 플레이어 목록
    const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));

    // 현재 플레이어의 인덱스 찾기
    const currentIndex = sortedPlayers.findIndex((p) => p.id === playerId);

    // 다음 플레이어 찾기 (카드가 있는 플레이어 중에서)
    let nextIndex = (currentIndex + 1) % sortedPlayers.length;
    let looped = false;
    while (sortedPlayers[nextIndex].cards.length === 0) {
      nextIndex = (nextIndex + 1) % sortedPlayers.length;
      if (nextIndex === currentIndex) {
        looped = true;
        break;
      }
    }

    // 모두가 cards가 0장인 경우, 현재 턴을 유지 (게임 종료는 pass에서 처리하지 않음)
    if (looped) {
      nextIndex = currentIndex;
    }

    // 모든 플레이어가 패스했을 때 라운드 넘김
    let allPassed = false;
    if (game.lastPlay && game.lastPlay.playerId) {
      if (game.finishedPlayers.length > 0) {
        // 게임을 종료한 유저가 있을 때
        allPassed = game.players
          .filter((p) => !game.finishedPlayers.includes(p.id) && p.id !== game.lastPlay!.playerId)
          .every((p) => p.isPassed);
      } else {
        // 게임을 종료한 유저가 없을 때
        allPassed = game.players
          .filter((p) => p.id !== game.lastPlay!.playerId)
          .every((p) => p.isPassed);
      }
    }

    if (allPassed && game.lastPlay && game.lastPlay.playerId) {
      // 새로운 라운드 시작
      const prevLastPlayerId = game.lastPlay.playerId;
      game.round++;
      game.lastPlay = undefined;
      game.players.forEach((p) => {
        if (!game.finishedPlayers.includes(p.id)) {
          p.isPassed = false;
        }
      });

      // rank가 낮을수록 높은 순위이므로 오름차순 정렬
      const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));

      // 마지막으로 카드를 낸 플레이어의 인덱스 찾기
      const lastPlayerIndex = sortedPlayers.findIndex((p) => p.id === prevLastPlayerId);

      // 다음 라운드 시작 플레이어 찾기
      let nextPlayerIndex = lastPlayerIndex;

      // 카드가 있고 게임을 완료하지 않은 플레이어를 찾을 때까지 다음 플레이어로 이동
      while (
        sortedPlayers[nextPlayerIndex].cards.length === 0 ||
        game.finishedPlayers.includes(sortedPlayers[nextPlayerIndex].id)
      ) {
        nextPlayerIndex = (nextPlayerIndex + 1) % sortedPlayers.length;
        if (nextPlayerIndex === lastPlayerIndex) break;
      }

      game.currentTurn = sortedPlayers[nextPlayerIndex].id;
    } else {
      game.currentTurn = sortedPlayers[nextIndex].id;
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      currentTurn: game.currentTurn,
      round: game.round,
      lastPlay: game.lastPlay,
      playerStats: game.playerStats,
    });

    return true;
  }

  public async selectRole(roomId: string, playerId: string, roleNumber: number): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game) {
      return false;
    }

    if (
      game.phase !== 'roleSelection' ||
      roleNumber < 1 ||
      roleNumber > game.roleSelectionDeck.length
    ) {
      return false;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.role !== null) {
      return false;
    }

    const roleSelectionCard = game.roleSelectionDeck.find((r) => r.number === roleNumber);
    if (!roleSelectionCard || roleSelectionCard.isSelected) {
      return false;
    }

    roleSelectionCard.isSelected = true;
    roleSelectionCard.selectedBy = playerId;
    player.role = roleSelectionCard.number;

    const allPlayersHaveRole = game.players.every((p) => p.role !== null);
    if (allPlayersHaveRole) {
      const sortedPlayers = [...game.players].sort((a, b) => (a.role || 0) - (b.role || 0));
      sortedPlayers.forEach((p, index) => {
        p.rank = index + 1;
      });

      // 자동으로 카드 섞기 및 배분
      this.initializeDeck(game);
      this.shuffleDeck(game);

      // 플레이어 수에 맞게 각 플레이어가 선택할 수 있는 덱 생성
      const playerCount = game.players.length;
      const cardsPerPlayer = Math.floor(game.deck.length / playerCount);
      const remainingCards = game.deck.length % playerCount;

      // 각 플레이어의 카드 초기화
      game.players.forEach((player) => {
        player.cards = [];
      });

      // selectableDecks 초기화
      game.selectableDecks = [];

      // 각 플레이어에게 동일한 수의 카드 배분
      for (let i = 0; i < playerCount; i++) {
        const startIndex = i * cardsPerPlayer;
        const endIndex = startIndex + cardsPerPlayer;
        game.selectableDecks.push({
          cards: game.deck.slice(startIndex, endIndex),
          isSelected: false,
        });
      }

      // 남은 카드가 있다면 순서대로 배분
      if (remainingCards > 0) {
        for (let i = 0; i < remainingCards; i++) {
          const cardIndex = playerCount * cardsPerPlayer + i;
          game.selectableDecks[i].cards.push(game.deck[cardIndex]);
        }
      }

      // 모든 카드 배분이 끝난 후 한 번에 정렬
      for (const deck of game.selectableDecks) {
        deck.cards.sort((a, b) => {
          if (a.isJoker && !b.isJoker) return 1;
          if (!a.isJoker && b.isJoker) return -1;
          return a.rank - b.rank;
        });
      }

      // rank가 낮을수록 높은 순위이므로 오름차순 정렬
      const rankedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));

      // 카드 선택 단계로 전환
      game.phase = 'cardSelection';
      game.currentTurn = rankedPlayers[0].id; // 가장 높은 순위의 플레이어부터 시작
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      roleSelectionDeck: game.roleSelectionDeck,
      phase: game.phase,
      deck: game.deck,
      currentTurn: game.currentTurn,
      selectableDecks: game.selectableDecks,
    });

    return true;
  }

  public async selectDeck(roomId: string, playerId: string, cardIndex: number): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game || game.phase !== 'cardSelection' || game.currentTurn !== playerId) {
      console.log('game not found or phase not cardSelection or currentTurn not playerId');
      return false;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player || cardIndex < 0 || cardIndex >= game.selectableDecks.length) {
      console.log('player not found or card index out of range');
      return false;
    }

    // 카드 선택
    const selectedCard = game.selectableDecks[cardIndex];
    if (!selectedCard || selectedCard.isSelected) {
      console.log('selected card not found or already selected');
      return false;
    }

    selectedCard.isSelected = true;
    selectedCard.selectedBy = playerId;
    player.cards.push(...selectedCard.cards);

    // rank가 낮을수록 높은 순위이므로 오름차순 정렬
    const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));

    // 현재 플레이어의 인덱스 찾기
    const currentPlayerIndex = sortedPlayers.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
    game.currentTurn = sortedPlayers[nextPlayerIndex].id;

    // 모든 카드가 배분되었는지 확인
    const allDecksSelected = game.selectableDecks.every((deck) => deck.isSelected);
    if (allDecksSelected) {
      // 조커 2장을 받은 플레이어 찾기
      const doubleJokerPlayer = game.players.find(
        (p) => p.cards.filter((card) => card.isJoker).length === 2
      );

      if (doubleJokerPlayer) {
        const originalRank = doubleJokerPlayer.rank || 0;
        if (originalRank !== 1) {
          // 조커 2장 플레이어를 1등으로 설정
          doubleJokerPlayer.rank = 1;

          // 원래 순서를 유지하면서 순위 재배정
          const players = [...game.players];
          const doubleJokerIndex = players.findIndex((p) => p === doubleJokerPlayer);

          // 조커 2장 플레이어 다음부터 순서대로 2등, 3등, ...으로 설정
          let newRank = 2;
          for (let i = 1; i < players.length; i++) {
            const currentIndex = (doubleJokerIndex + i) % players.length;
            if (players[currentIndex] !== doubleJokerPlayer) {
              players[currentIndex].rank = newRank++;
            }
          }

          // currentTurn을 조커 2장을 받은 플레이어로 변경
          game.currentTurn = doubleJokerPlayer.id;
        }
      }

      // 게임 시작 준비
      game.phase = 'playing';
      game.lastPlay = undefined;
      game.round = 1;
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      phase: game.phase,
      deck: game.deck,
      currentTurn: game.currentTurn,
      lastPlay: game.lastPlay,
      round: game.round,
      selectableDecks: game.selectableDecks,
    });

    return true;
  }

  public async setPlayerReady(roomId: string, playerId: string): Promise<Game | null> {
    const game = await this.db.getGame(roomId);
    if (!game) {
      return null;
    }

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return null;
    }

    const updatedPlayers = [...game.players];
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
              totalCardsPlayed: 0,
              totalPasses: 0,
              finishedAtRound: 0,
            };
            return {
              playerId,
              nickname: player?.nickname || '',
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
          const playerCount = updatedGame.players.length;
          const cardsPerPlayer = Math.floor(updatedGame.deck.length / playerCount);
          const remainingCards = updatedGame.deck.length % playerCount;

          // selectableDecks 초기화
          updatedGame.selectableDecks = [];

          // 각 플레이어에게 동일한 수의 카드 배분
          for (let i = 0; i < playerCount; i++) {
            const startIndex = i * cardsPerPlayer;
            const endIndex = startIndex + cardsPerPlayer;
            updatedGame.selectableDecks.push({
              cards: updatedGame.deck.slice(startIndex, endIndex),
              isSelected: false,
            });
          }

          // 남은 카드가 있다면 순서대로 배분
          if (remainingCards > 0) {
            for (let i = 0; i < remainingCards; i++) {
              const cardIndex = playerCount * cardsPerPlayer + i;
              updatedGame.selectableDecks[i].cards.push(updatedGame.deck[cardIndex]);
            }
          }

          // 모든 카드 배분이 끝난 후 한 번에 정렬
          for (const deck of updatedGame.selectableDecks) {
            deck.cards.sort((a, b) => {
              if (a.isJoker && !b.isJoker) return 1;
              if (!a.isJoker && b.isJoker) return -1;
              return a.rank - b.rank;
            });
          }

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
    game.playerStats = {};
    game.players.forEach((player) => {
      game.playerStats[player.id] = {
        totalCardsPlayed: 0,
        totalPasses: 0,
        finishedAtRound: 0,
      };
    });
    game.roundPlays = [];
  }
}
