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
