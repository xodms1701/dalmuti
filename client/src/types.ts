export enum Role {
  KING = '왕',
  QUEEN = '여왕',
  PRINCE = '왕자',
  PRINCESS = '공주',
  DUKE = '공작',
  DUCHESS = '공작부인',
  KNIGHT = '기사',
  SERF = '농노'
}

export interface Card {
  rank: number;
  name: string;
  suit?: 'spade' | 'joker';
  count?: number;
}

export interface Player {
  id: string;
  nickname: string;
  cards: Card[];
  role: Role | null;
  hasDoubleJoker: boolean;
  isPassed: boolean;
  isReady: boolean;
}

export interface Play {
  playerId: string;
  cards: Card[];
}

export interface UIState {
  currentPhase: GamePhase;
  message: string;
  exchangeablePlayers: string[];
}

export interface GameState {
  players: Player[];
  currentTurn: string | null;
  lastPlay: Play | null;
  gameStarted: boolean;
  phase: GamePhase;
  firstPlayer: string | null;
  exchangeCount: number;
  revolution: boolean;
  uiState: UIState;
}

export interface UserState {
  userId: string;
  nickname: string;
}

export interface RoomState {
  roomCode: string | null;
  roomName: string | null;
}

export enum GamePhase {
  WAITING = 'waiting',
  ROLE_ASSIGNMENT = 'role_assignment',
  CARD_EXCHANGE = 'card_exchange',
  PLAYING = 'playing'
} 