export interface Card {
  rank: number;  // 1-13 (13은 조커)
  suit: 'spade' | 'joker';  // 실제로는 suit가 필요 없지만 타입을 위해 추가
}

export interface Player {
  id: string;
  nickname: string;
  cards: Card[];
  role: number | null;  // 게임 시작 시 뽑은 카드 숫자 (계급)
  hasDoubleJoker: boolean;
  isPassed: boolean;
  isReady: boolean;  // 역할 카드 뽑기 준비 상태
}

export interface Play {
  playerId: string;
  cards: Card[];
}

export interface GameState {
  players: Player[];
  currentTurn: number;
  lastPlay: Play | null;
  gameStarted: boolean;
  phase: 'role' | 'exchange' | 'playing' | 'finished';
  firstPlayer: string | null;  // 현재 라운드에서 처음 카드를 낸 플레이어
  exchangeCount: number;  // 카드 교환 횟수 추적
} 