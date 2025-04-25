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

export type GamePhase = 'waiting' | 'role' | 'exchange' | 'playing' | 'finished';

export interface BasePlayer {
  id: string;
  nickname: string;
}

export interface WaitingPlayer extends BasePlayer {
  phase: 'waiting';
  isReady: boolean;
}

export interface RolePlayer extends BasePlayer {
  phase: 'role';
  isReady: boolean;
  role: Role | null;
  cards: Card[];
  hasDoubleJoker: boolean;
}

export interface ExchangePlayer extends BasePlayer {
  phase: 'exchange';
  role: Role;
  cards: Card[];
  hasDoubleJoker: boolean;
}

export interface PlayingPlayer extends BasePlayer {
  phase: 'playing';
  role: Role;
  cards: Card[];
  hasDoubleJoker: boolean;
  isPassed: boolean;
}

export interface FinishedPlayer extends BasePlayer {
  phase: 'finished';
  role: Role;
  cards: Card[];
  hasDoubleJoker: boolean;
  isPassed: boolean;
}

export type Player = WaitingPlayer | RolePlayer | ExchangePlayer | PlayingPlayer | FinishedPlayer;

export interface Play {
  playerId: string;
  cards: Card[];
}

export interface GameState {
  players: Player[];
  currentTurn: string | null;
  lastPlay: Play | null;
  gameStarted: boolean;
  phase: GamePhase;
  firstPlayer: string | null;
  exchangeCount: number;
  uiState: {
    currentPhase: GamePhase;
    currentPlayerId: string | null;
    exchangeablePlayers: string[];  // 현재 플레이어가 교환 가능한 상대방 ID 목록
    requiredAction: 'wait' | 'selectCards' | 'exchange' | 'play' | 'pass';
    message: string;  // 플레이어에게 보여줄 메시지
  };
} 