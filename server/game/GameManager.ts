import { Card, Player, GameState } from '../types';

export class GameManager {
  private deck: Card[] = [];
  private players: Player[] = [];
  private currentTurn: string | null = null;
  private lastPlay: { playerId: string; cards: Card[] } | null = null;
  private gameStarted = false;
  private phase: 'role' | 'exchange' | 'playing' | 'finished' = 'role';
  private firstPlayer: string | null = null;
  private exchangeCount = 0;
  private revolution = false;

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    this.deck = [];

    // 일반 카드 (1-12)
    for (let rank = 1; rank <= 12; rank++) {
      // 각 숫자마다 rank 장의 카드를 생성
      for (let i = 0; i < rank; i++) {
        this.deck.push({ rank, suit: 'spade' }); // 무늬는 중요하지 않으므로 모두 spade로 설정
      }
    }

    // 조커
    this.deck.push({ rank: 0, suit: 'joker' });
  }

  public shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public addPlayer(id: string, nickname: string): void {
    if (!this.players.some(p => p.id === id)) {
      this.players.push({
        id,
        nickname,
        cards: [],
        role: null,
        hasDoubleJoker: false,
        isPassed: false,
        isReady: false
      });
    }
  }

  public removePlayer(id: string): void {
    this.players = this.players.filter(p => p.id !== id);
  }

  public dealCards(): void {
    this.shuffleDeck();
    const cardsPerPlayer = Math.floor(this.deck.length / this.players.length);
    
    this.players.forEach(player => {
      player.cards = this.deck.splice(0, cardsPerPlayer);
      player.cards.sort((a, b) => a.rank - b.rank);
    });
  }

  public startGame(): void {
    this.gameStarted = true;
    this.phase = 'role';
    this.dealCards();
    this.currentTurn = this.players[0].id;
    this.firstPlayer = this.players[0].id;
  }

  public playCards(playerId: string, cards: Card[]): boolean {
    if (this.currentTurn !== playerId || this.phase !== 'playing') {
      return false;
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    // 카드 유효성 검사
    if (!this.isValidPlay(cards)) {
      return false;
    }

    // 카드 제거
    cards.forEach(card => {
      const index = player.cards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (index !== -1) {
        player.cards.splice(index, 1);
      }
    });

    this.lastPlay = { playerId, cards };
    
    // 레볼루션 체크
    if (this.isRevolution(cards)) {
      this.revolution = !this.revolution;
    }

    // 다음 턴 설정
    this.setNextTurn();

    return true;
  }

  private isValidPlay(cards: Card[]): boolean {
    if (cards.length === 0) return false;

    // 첫 플레이인 경우
    if (!this.lastPlay) {
      return true;
    }

    // 레볼루션 상태에서의 유효성 검사
    if (this.revolution) {
      return cards.every(card => card.rank <= this.lastPlay!.cards[0].rank);
    } else {
      return cards.every(card => card.rank >= this.lastPlay!.cards[0].rank);
    }
  }

  private isRevolution(cards: Card[]): boolean {
    return cards.length === 4 && cards.every(card => card.rank === cards[0].rank);
  }

  private setNextTurn(): void {
    const currentIndex = this.players.findIndex(p => p.id === this.currentTurn);
    let nextIndex = (currentIndex + 1) % this.players.length;
    
    // 패스한 플레이어 건너뛰기
    while (this.players[nextIndex].isPassed) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }

    this.currentTurn = this.players[nextIndex].id;
  }

  public getGameState(): GameState {
    return {
      players: this.players,
      currentTurn: this.currentTurn,
      lastPlay: this.lastPlay,
      gameStarted: this.gameStarted,
      phase: this.phase,
      firstPlayer: this.firstPlayer,
      exchangeCount: this.exchangeCount,
      revolution: this.revolution
    };
  }

  public isGameOver(): boolean {
    return this.players.some(player => player.cards.length === 0);
  }
} 