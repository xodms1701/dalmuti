export interface Card {
  rank: number;
  suit: 'spade' | 'joker';
  count?: number;
}

export interface Player {
  id: string;
  nickname: string;
  cards: Card[];
  role: number | null;
  hasDoubleJoker: boolean;
  isPassed: boolean;
  isReady: boolean;
}

export interface Play {
  playerId: string;
  cards: Card[];
}

export interface GameState {
  players: Player[];
  currentTurn: string | null;
  lastPlay: Play | null;
  gameStarted: boolean;
  phase: 'role' | 'exchange' | 'playing' | 'finished';
  firstPlayer: string | null;
  exchangeCount: number;
  revolution: boolean;
} 