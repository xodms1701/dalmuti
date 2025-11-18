/**
 * GameTypes.ts
 *
 * Game Entity에서 사용하는 타입 정의
 * any 타입 사용을 방지하기 위한 명시적 타입 정의
 */

import { Card } from '../entities/Card';

/**
 * 선택 가능한 덱
 * 카드 선택 페이즈에서 사용
 */
export interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;
  selectedBy?: string;
}

/**
 * 역할 선택 카드
 * 역할 선택 페이즈에서 사용
 */
export interface RoleSelectionCard {
  number: number;
  isSelected: boolean;
  selectedBy?: string;
}

/**
 * 세금 교환 정보
 * 세금 페이즈에서 사용
 */
export interface TaxExchange {
  fromPlayerId: string;
  toPlayerId: string;
  cardCount: number;
  cardsGiven: ReturnType<Card['toPlainObject']>[];
}

/**
 * 라운드별 플레이 기록
 * 게임 진행 중 각 플레이 기록
 */
export interface RoundPlay {
  round: number;
  playerId: string;
  cards: ReturnType<Card['toPlainObject']>[];
  timestamp: Date;
}

/**
 * 플레이어 통계 정보
 * 게임 종료 시 플레이어별 상세 통계
 */
export interface PlayerStats {
  nickname: string;
  totalCardsPlayed: number;
  totalPasses: number;
  finishedAtRound: number;
}

/**
 * 게임 히스토리
 * 한 세션 내에서 진행된 각 게임의 결과 기록
 */
export interface GameHistory {
  gameNumber: number;
  players: {
    playerId: string;
    nickname: string;
    rank: number;
    finishedAtRound: number;
    totalCardsPlayed: number;
    totalPasses: number;
  }[];
  finishedOrder: string[];
  totalRounds: number;
  roundPlays: RoundPlay[];
  startedAt: Date;
  endedAt: Date;
}
