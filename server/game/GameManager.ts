import { Card, Game, Player, RoleSelectionCard, Database } from '../types';

export default class GameManager {
  private readonly MIN_PLAYERS = 4;

  private readonly MAX_PLAYERS = 8;

  private db: Database;

  constructor(db: Database) {
    this.db = db;
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

    await this.db.updateGame(roomId, {
      phase: game.phase,
      deck: game.deck,
      roleSelectionDeck: game.roleSelectionDeck,
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
      const lastCard = game.lastPlay.cards[0];
      if (cards[0].rank > lastCard.rank) {
        return game;
      }
    }

    // 카드를 플레이
    const playedCards = cardIndices.map((index) => player.cards.splice(index, 1)[0]);
    game.lastPlay = {
      playerId,
      cards: playedCards,
    };

    // 플레이어의 카드가 모두 소진되었는지 확인
    if (player.cards.length === 0) {
      // 플레이어를 완료 목록에 추가
      if (!game.finishedPlayers.includes(playerId)) {
        game.finishedPlayers.push(playerId);
      }

      // 모든 플레이어의 카드가 소진되었는지 확인
      if (game.finishedPlayers.length === game.players.length) {
        // 모든 플레이어의 카드가 소진되었으므로 게임 종료
        game.phase = 'gameEnd';
        game.isVoting = true;
        game.votes = {};
        game.nextGameVotes = {};
      } else {
        // 다음 턴으로 넘어감
        const currentPlayerIndex = game.players.findIndex((p) => p.id === playerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        game.currentTurn = game.players[nextPlayerIndex].id;
      }
    } else {
      // 다음 턴으로 넘어감
      const currentPlayerIndex = game.players.findIndex((p) => p.id === playerId);
      const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      game.currentTurn = game.players[nextPlayerIndex].id;
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      currentTurn: game.currentTurn,
      lastPlay: game.lastPlay,
      round: game.round,
      phase: game.phase,
      finishedPlayers: game.finishedPlayers,
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

    currentPlayer.isPassed = true;
    this.setNextTurn(game);

    await this.db.updateGame(roomId, {
      players: game.players,
      currentTurn: game.currentTurn,
      round: game.round,
      lastPlay: game.lastPlay,
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
    if (!player) {
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

      game.phase = 'roleSelectionComplete';
    }

    await this.db.updateGame(roomId, {
      players: game.players,
      roleSelectionDeck: game.roleSelectionDeck,
      phase: game.phase,
    });

    return true;
  }

  public async dealCards(roomId: string, playerId: string): Promise<boolean> {
    const game = await this.db.getGame(roomId);
    if (!game || game.phase !== 'roleSelectionComplete') {
      return false;
    }

    if (game.ownerId !== playerId) {
      return false;
    }

    // 덱 섞기
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

    // rank가 낮을수록 높은 순위이므로 오름차순 정렬
    const sortedPlayers = [...game.players].sort((a, b) => (a.rank || 0) - (b.rank || 0));

    // 카드 선택 단계로 전환
    game.phase = 'cardSelection';
    game.currentTurn = sortedPlayers[0].id; // 가장 높은 순위의 플레이어부터 시작

    await this.db.updateGame(roomId, {
      phase: game.phase,
      deck: game.deck,
      currentTurn: game.currentTurn,
      players: game.players,
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
          // 1등이 아닌 경우에만 순서 역전
          game.players.forEach((p) => {
            if (p.rank) {
              if (p.rank === originalRank) {
                p.rank = 1;
              } else if (p.rank > originalRank) {
                p.rank -= 1;
              } else {
                p.rank += 1;
              }
            }
          });
        }
        // 1등이 조커 2장이면 아무것도 하지 않음
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
      // 투표 결과에 따라 다음 게임 시작 여부 결정
      const nextGameVotes = Object.values(game.votes).filter((v) => v).length;
      const majority = Math.ceil(game.players.length / 2);

      if (nextGameVotes >= majority) {
        // 다음 게임 시작
        const newGame = await this.createGame(game.ownerId, game.players[0].nickname);
        if (newGame) {
          game.nextGameVotes[playerId] = true;
          await this.db.updateGame(roomId, {
            nextGameVotes: game.nextGameVotes,
          });
        }
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
    return Array.from({ length: 13 }, (_, i) => ({
      number: i + 1,
      isSelected: false,
    }));
  }

  private shuffleDeck(game: Game): void {
    for (let i = game.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
    }
  }

  private setNextTurn(game: Game): void {
    const currentIndex = game.players.findIndex((p) => p.id === game.currentTurn);
    let nextIndex = (currentIndex + 1) % game.players.length;

    let loopCount = 0;
    while (game.players[nextIndex].isPassed && loopCount < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      loopCount++;
    }

    const lastPlayerId = game.lastPlay?.playerId;
    const allPassed = game.players.filter((p) => p.id !== lastPlayerId).every((p) => p.isPassed);

    if (allPassed) {
      game.round++;
      game.lastPlay = undefined;
      game.players.forEach((p) => (p.isPassed = false));
      game.currentTurn = lastPlayerId || game.players[0].id;
    } else {
      game.currentTurn = game.players[nextIndex].id;
    }
  }
}
