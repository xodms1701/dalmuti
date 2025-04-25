import { Card, Player, GameState, GamePhase, Role, WaitingPlayer, RolePlayer, ExchangePlayer, PlayingPlayer } from '../types';

export class GameManager {
  private players: Player[] = [];
  private currentTurn: string | null = null;
  private lastPlay: { playerId: string; cards: Card[] } | null = null;
  private gameStarted = false;
  private phase: GamePhase = 'waiting';
  private firstPlayer: string | null = null;
  private exchangeCount = 0;
  private uiState: {
    currentPhase: GamePhase;
    currentPlayerId: string | null;
    exchangeablePlayers: string[];
    requiredAction: 'wait' | 'selectCards' | 'exchange' | 'play' | 'pass';
    message: string;
  } = {
    currentPhase: 'waiting',
    currentPlayerId: null,
    exchangeablePlayers: [],
    requiredAction: 'wait',
    message: ''
  };

  addPlayer(player: WaitingPlayer): void {
    if (this.players.some(p => p.id === player.id)) {
      throw new Error('Player already exists');
    }
    this.players.push(player);
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  startGame(): void {
    if (this.players.length < 2) {
      throw new Error('Not enough players');
    }

    const cards = GameManager.shuffleAndDeal(this.players.length);
    let currentIndex = 0;

    this.players = this.players.map(player => {
      const playerCards = cards[currentIndex];
      currentIndex++;

      const hasDoubleJoker = playerCards.some(card => card.rank === 0) && 
                           playerCards.filter(card => card.rank === 0).length === 2;

      return {
        ...player,
        phase: 'role',
        role: null,
        cards: playerCards,
        hasDoubleJoker
      } as RolePlayer;
    });

    this.gameStarted = true;
    this.phase = 'role';
    this.updateUIState();
  }

  assignRoles(): void {
    const rolePlayers = this.players as RolePlayer[];
    const roles: Role[] = [
      Role.KING,
      Role.QUEEN,
      Role.PRINCE,
      Role.PRINCESS,
      Role.DUKE,
      Role.DUCHESS,
      Role.KNIGHT,
      Role.SERF
    ].slice(0, this.players.length);

    this.players = rolePlayers.map(player => ({
      ...player,
      phase: 'exchange',
      role: roles[this.players.indexOf(player)]
    })) as ExchangePlayer[];

    this.phase = 'exchange';
    this.updateUIState();
  }

  startPlaying(): void {
    this.players = this.players.map(player => ({
      ...player,
      phase: 'playing',
      isPassed: false
    })) as PlayingPlayer[];

    this.phase = 'playing';
    this.currentTurn = this.firstPlayer;
    this.updateUIState();
  }

  playCards(playerId: string, cards: Card[]): boolean {
    const player = this.players.find(p => p.id === playerId) as PlayingPlayer;
    if (!player || player.phase !== 'playing' || player.isPassed) {
      return false;
    }

    if (!this.isValidPlay(cards)) {
      return false;
    }

    player.cards = player.cards.filter(card => 
      !cards.some(c => c.rank === card.rank && c.suit === card.suit)
    );

    this.lastPlay = { playerId, cards };
    this.currentTurn = this.getNextPlayerId(playerId);
    this.updateUIState();

    return true;
  }

  private getNextPlayerId(currentPlayerId: string): string {
    const currentIndex = this.players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % this.players.length;
    return this.players[nextIndex].id;
  }

  private isValidPlay(cards: Card[]): boolean {
    if (!this.lastPlay) return true;
    return cards.length === this.lastPlay.cards.length;
  }

  getGameState(): GameState {
    return {
      players: this.players,
      currentTurn: this.currentTurn,
      lastPlay: this.lastPlay,
      gameStarted: this.gameStarted,
      phase: this.phase,
      firstPlayer: this.firstPlayer,
      exchangeCount: this.exchangeCount,
      uiState: this.uiState
    };
  }

  private static shuffleAndDeal(playerCount: number): Card[][] {
    const deck = GameManager.createInitialDeck();
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const cardsPerPlayer = Math.floor(deck.length / playerCount);
    
    const hands: Card[][] = [];
    for (let i = 0; i < playerCount; i++) {
      const start = i * cardsPerPlayer;
      const end = start + cardsPerPlayer;
      hands.push(shuffled.slice(start, end));
    }
    
    return hands;
  }

  private static createInitialDeck(): Card[] {
    const deck: Card[] = [];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const suits = ['spade'] as const;
    
    for (const rank of ranks) {
      for (const suit of suits) {
        deck.push({ rank, suit, name: `${rank}${suit}` });
      }
    }
    
    deck.push({ rank: 0, suit: 'joker', name: 'joker1' });
    deck.push({ rank: 0, suit: 'joker', name: 'joker2' });
    
    return deck;
  }

  public pass(playerId: string): void {
    const player = this.players.find(p => p.id === playerId) as PlayingPlayer;
    if (!player || player.phase !== 'playing' || player.isPassed) {
      throw new Error('Cannot pass');
    }
    player.isPassed = true;
    this.currentTurn = this.getNextPlayerId(playerId);
    this.updateUIState();
  }

  private getRoleRank(role: Role): number {
    const roleRanks: Record<Role, number> = {
      [Role.KING]: 1,
      [Role.QUEEN]: 2,
      [Role.PRINCE]: 3,
      [Role.PRINCESS]: 4,
      [Role.DUKE]: 5,
      [Role.DUCHESS]: 6,
      [Role.KNIGHT]: 7,
      [Role.SERF]: 8
    };
    return roleRanks[role];
  }

  private isExchangeablePair(rank1: number, rank2: number): boolean {
    const totalRanks = 8; // 총 계급 수
    const validPairs = [
      [1, totalRanks],     // 1등과 꼴찌
      [2, totalRanks - 1]  // 2등과 뒤에서 2번째
    ];

    return validPairs.some(pair => 
      (pair[0] === rank1 && pair[1] === rank2) || 
      (pair[0] === rank2 && pair[1] === rank1)
    );
  }

  public exchangeCards(fromPlayerId: string, toPlayerId: string, cards: Card[]): void {
    if (this.phase !== 'exchange') {
      throw new Error('Not in exchange phase');
    }

    const fromPlayer = this.players.find(p => p.id === fromPlayerId) as ExchangePlayer;
    const toPlayer = this.players.find(p => p.id === toPlayerId) as ExchangePlayer;

    if (!fromPlayer || !toPlayer) {
      throw new Error('Player not found');
    }

    // 교환할 카드가 2장인지 확인
    if (cards.length !== 2) {
      throw new Error('Must exchange exactly 2 cards');
    }

    // 계급에 따른 교환 규칙 검증
    const fromPlayerRole = fromPlayer.role;
    const toPlayerRole = toPlayer.role;

    if (!fromPlayerRole || !toPlayerRole) {
      throw new Error('Players must have assigned roles');
    }

    const fromPlayerRank = this.getRoleRank(fromPlayerRole);
    const toPlayerRank = this.getRoleRank(toPlayerRole);

    // 교환 가능한 계급 쌍인지 확인
    const isExchangeable = this.isExchangeablePair(fromPlayerRank, toPlayerRank);
    if (!isExchangeable) {
      throw new Error('These ranks cannot exchange cards');
    }

    // 낮은 계급이 높은 계급에게 카드를 주는 경우
    if (fromPlayerRank > toPlayerRank) {
      // 낮은 계급은 반드시 가장 높은 카드 2장을 주어야 함
      const highestCards = [...fromPlayer.cards]
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 2);

      const isValidExchange = cards.every(card => 
        highestCards.some(highestCard => 
          highestCard.rank === card.rank && highestCard.suit === card.suit
        )
      );

      if (!isValidExchange) {
        throw new Error('Lower rank player must give their highest 2 cards');
      }
    } 
    // 높은 계급이 낮은 계급에게 카드를 주는 경우
    else if (fromPlayerRank < toPlayerRank) {
      // 높은 계급은 자신이 선택한 카드를 줄 수 있음
      // 단, 카드가 자신의 소유인지만 확인
      const isValidExchange = cards.every(card => 
        fromPlayer.cards.some(c => c.rank === card.rank && c.suit === card.suit)
      );

      if (!isValidExchange) {
        throw new Error('Invalid cards for exchange');
      }
    }

    // 카드 교환
    cards.forEach(card => {
      const index = fromPlayer.cards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (index !== -1) {
        fromPlayer.cards.splice(index, 1);
        toPlayer.cards.push(card);
      }
    });

    this.exchangeCount++;
    
    // 모든 교환이 완료되었는지 확인
    if (this.exchangeCount >= this.players.length) {
      this.startPlaying();
    } else {
      this.updateUIState();
    }
  }

  public isGameOver(): boolean {
    return this.players.some(player => {
      if (player.phase === 'playing') {
        return player.cards.length === 0;
      }
      return false;
    });
  }

  public getWinner(): string | null {
    if (!this.isGameOver()) {
      return null;
    }
    
    const winner = this.players.find(player => 
      player.phase === 'playing' && player.cards.length === 0
    );
    
    return winner ? winner.id : null;
  }

  private updateUIState(): void {
    const currentPlayer = this.players.find(p => p.id === this.currentTurn);
    
    let requiredAction: 'wait' | 'selectCards' | 'exchange' | 'play' | 'pass' = 'wait';
    let message = '';
    let exchangeablePlayers: string[] = [];

    switch (this.phase) {
      case 'waiting':
        requiredAction = 'wait';
        message = '게임 시작을 기다리는 중입니다...';
        break;

      case 'role':
        requiredAction = 'wait';
        message = '역할이 할당되었습니다.';
        break;

      case 'exchange':
        if (currentPlayer) {
          const currentPlayerRole = (currentPlayer as RolePlayer | ExchangePlayer | PlayingPlayer).role;
          if (!currentPlayerRole) {
            requiredAction = 'wait';
            message = '역할이 할당되지 않았습니다.';
            break;
          }
          
          const currentPlayerRank = this.getRoleRank(currentPlayerRole);
          
          // 교환 가능한 상대방 찾기
          exchangeablePlayers = this.players
            .filter(p => {
              const playerRole = (p as RolePlayer | ExchangePlayer | PlayingPlayer).role;
              if (!playerRole) return false;
              const otherRank = this.getRoleRank(playerRole);
              return this.isExchangeablePair(currentPlayerRank, otherRank);
            })
            .map(p => p.id);

          if (exchangeablePlayers.length > 0) {
            requiredAction = 'exchange';
            message = '카드를 교환할 상대를 선택하세요.';
          } else {
            requiredAction = 'wait';
            message = '카드 교환 단계입니다.';
          }
        }
        break;

      case 'playing':
        if (currentPlayer) {
          requiredAction = 'play';
          message = '카드를 내거나 패스하세요.';
        } else {
          requiredAction = 'wait';
          message = '다른 플레이어의 턴입니다.';
        }
        break;

      case 'finished':
        requiredAction = 'wait';
        message = '게임이 종료되었습니다.';
        break;
    }

    this.uiState = {
      currentPhase: this.phase,
      currentPlayerId: this.currentTurn,
      exchangeablePlayers,
      requiredAction,
      message
    };
  }
} 