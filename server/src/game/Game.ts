import { Deck } from './Deck';
import { Card, Player, Play, GameState } from './types';

export class Game {
  private deck: Deck;
  private players: Player[];
  private currentTurn: number;
  private lastPlay: Play | null;
  private gameStarted: boolean;
  private phase: 'role' | 'exchange' | 'playing' | 'finished';
  private firstPlayer: string | null;
  private exchangeCount: number;

  constructor() {
    this.deck = new Deck();
    this.players = [];
    this.currentTurn = 0;
    this.lastPlay = null;
    this.gameStarted = false;
    this.phase = 'role';
    this.firstPlayer = null;
    this.exchangeCount = 0;
  }

  addPlayer(id: string, nickname: string): void {
    if (this.gameStarted) {
      throw new Error('게임이 이미 시작되었습니다.');
    }
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

  setPlayerReady(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }
    player.isReady = true;

    // 모든 플레이어가 준비되었는지 확인
    if (this.players.every(p => p.isReady)) {
      this.startGame();
    }
  }

  private startGame(): void {
    if (this.players.length < 2) {
      throw new Error('최소 2명의 플레이어가 필요합니다.');
    }

    this.deck.shuffle();
    this.gameStarted = true;
    this.phase = 'role';
  }

  drawRoleCard(playerId: string): number | null {
    if (this.phase !== 'role') {
      throw new Error('역할 카드를 뽑을 수 있는 단계가 아닙니다.');
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }

    if (player.role !== null) {
      throw new Error('이미 역할 카드를 뽑았습니다.');
    }

    const card = this.deck.drawCard();
    if (!card) {
      throw new Error('더 이상 카드가 없습니다.');
    }

    player.role = card.rank;

    // 모든 플레이어가 역할 카드를 뽑았는지 확인
    if (this.players.every(p => p.role !== null)) {
      this.setupGame();
    }

    return card.rank;
  }

  private setupGame(): void {
    // 조커 2장을 가진 플레이어 확인
    const doubleJokerPlayer = this.players.find(p => p.hasDoubleJoker);
    if (doubleJokerPlayer) {
      // 조커 2장을 가진 플레이어를 가장 높은 계급으로 설정
      doubleJokerPlayer.role = 1;
    }

    // 계급 순서대로 정렬 (낮은 숫자가 높은 계급)
    this.players.sort((a, b) => (a.role || 0) - (b.role || 0));

    // 카드 분배
    const hands = this.deck.deal(this.players.length);
    this.players.forEach((player, index) => {
      player.cards = hands[index];
      // 조커 2장 확인
      const jokerCount = player.cards.filter(card => card.rank === 13).length;
      if (jokerCount === 2) {
        player.hasDoubleJoker = true;
      }
    });

    this.phase = 'exchange';
  }

  exchangeCards(fromPlayerId: string, toPlayerId: string, cards: Card[]): void {
    if (this.phase !== 'exchange') {
      throw new Error('카드 교환 단계가 아닙니다.');
    }

    const fromPlayer = this.players.find(p => p.id === fromPlayerId);
    const toPlayer = this.players.find(p => p.id === toPlayerId);

    if (!fromPlayer || !toPlayer) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }

    // 카드 교환 로직
    cards.forEach(card => {
      const fromIndex = fromPlayer.cards.findIndex(
        c => c.rank === card.rank && c.suit === card.suit
      );
      if (fromIndex !== -1) {
        const [removedCard] = fromPlayer.cards.splice(fromIndex, 1);
        toPlayer.cards.push(removedCard);
      }
    });

    this.exchangeCount++;

    // 모든 교환이 완료되었는지 확인
    if (this.isExchangeComplete()) {
      this.phase = 'playing';
      this.currentTurn = 0; // 가장 높은 계급부터 시작
    }
  }

  private isExchangeComplete(): boolean {
    // 4명 기준: 1-4, 2-3 교환
    const requiredExchanges = 2;
    return this.exchangeCount >= requiredExchanges;
  }

  playCards(playerId: string, cards: Card[]): boolean {
    if (this.phase !== 'playing') {
      throw new Error('게임 진행 단계가 아닙니다.');
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }

    if (player.id !== this.players[this.currentTurn].id) {
      throw new Error('당신의 턴이 아닙니다.');
    }

    // 조커 카드 처리
    const jokerCount = cards.filter(card => card.rank === 13).length;
    if (jokerCount > 0) {
      if (cards.length > 1) {
        const otherCard = cards.find(card => card.rank !== 13);
        if (otherCard) {
          cards = cards.map(card => ({
            ...card,
            rank: otherCard.rank
          }));
        }
      }
    }

    if (!this.isValidPlay(cards)) {
      return false;
    }

    // 카드 제거
    cards.forEach(card => {
      const index = player.cards.findIndex(
        c => c.rank === card.rank && c.suit === card.suit
      );
      if (index !== -1) {
        player.cards.splice(index, 1);
      }
    });

    this.lastPlay = { playerId, cards };
    
    // 1번 카드를 낸 경우
    if (cards[0].rank === 1) {
      this.currentTurn = this.players.findIndex(p => p.id === playerId);
    } else {
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
    }

    // 모든 플레이어가 패스했는지 확인
    if (this.checkAllPassed()) {
      this.firstPlayer = playerId;
      this.resetPassedStatus();
    }

    // 게임 종료 체크
    if (player.cards.length === 0) {
      this.phase = 'finished';
    }

    return true;
  }

  pass(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }

    player.isPassed = true;
    this.currentTurn = (this.currentTurn + 1) % this.players.length;

    // 모든 플레이어가 패스했는지 확인
    if (this.checkAllPassed()) {
      this.firstPlayer = this.lastPlay?.playerId || null;
      this.resetPassedStatus();
    }
  }

  private isValidPlay(cards: Card[]): boolean {
    if (!this.lastPlay) return true;

    // 카드 개수가 일치해야 함
    if (cards.length !== this.lastPlay.cards.length) {
      return false;
    }

    const lastRank = this.lastPlay.cards[0].rank;
    const currentRank = cards[0].rank;

    return currentRank > lastRank;
  }

  private checkAllPassed(): boolean {
    return this.players.every(p => p.isPassed || p.id === this.firstPlayer);
  }

  private resetPassedStatus(): void {
    this.players.forEach(p => p.isPassed = false);
  }

  getGameState(): GameState {
    return {
      players: this.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        cards: p.cards,
        role: p.role,
        hasDoubleJoker: p.hasDoubleJoker,
        isPassed: p.isPassed,
        isReady: p.isReady
      })),
      currentTurn: this.currentTurn,
      lastPlay: this.lastPlay,
      gameStarted: this.gameStarted,
      phase: this.phase,
      firstPlayer: this.firstPlayer,
      exchangeCount: this.exchangeCount
    };
  }
} 
