/**
 * DeckService.ts
 *
 * 덱 관리 도메인 서비스
 * 카드 덱 생성, 배분, 섞기 등 덱 관련 비즈니스 로직을 담당
 *
 * Note: 기존 DeckHelper의 로직을 재사용하되, 도메인 엔티티를 사용하도록 변경
 */

import { Card } from '../entities/Card';
import * as DeckHelper from '../../../game/helpers/DeckHelper';

/**
 * 선택 가능한 덱 인터페이스
 * Card VO를 직접 사용
 */
export interface SelectableDeck {
  cards: ReturnType<Card['toPlainObject']>[];
  isSelected: boolean;
  selectedBy?: string;
}

/**
 * 표준 덱을 초기화합니다.
 * - 1-13 각 숫자당 4장씩 (총 52장)
 * - 조커 2장
 * - 총 54장
 *
 * @returns 초기화된 카드 덱 (plain object 형태)
 */
export function initializeDeck(): ReturnType<Card['toPlainObject']>[] {
  // 기존 헬퍼 함수 사용
  return DeckHelper.createStandardDeck();
}

/**
 * 덱을 섞습니다 (Fisher-Yates 알고리즘).
 * in-place로 섞지 않고 새로운 배열을 반환합니다.
 *
 * @param deck - 섞을 덱
 */
export function shuffleDeck(
  deck: ReturnType<Card['toPlainObject']>[]
): ReturnType<Card['toPlainObject']>[] {
  // 기존 헬퍼가 새 배열을 반환하므로, 불변성을 유지하여 결과 반환
  return DeckHelper.shuffleDeck(deck);
}

/**
 * 플레이어 수에 맞게 선택 가능한 덱을 생성합니다.
 * - 카드를 균등하게 배분
 * - 남은 카드는 순서대로 배분
 * - 각 덱의 카드를 정렬
 *
 * @param deck - 배분할 전체 카드 배열
 * @param playerCount - 플레이어 수
 * @returns 선택 가능한 덱 배열
 */
export function createSelectableDecks(
  deck: ReturnType<Card['toPlainObject']>[],
  playerCount: number
): SelectableDeck[] {
  // 기존 헬퍼 함수 사용
  return DeckHelper.createSelectableDecks(deck, playerCount);
}

/**
 * 역할 선택용 덱을 생성합니다.
 * 1부터 13까지의 숫자 카드를 섞어서 반환합니다.
 *
 * @returns 역할 선택 카드 배열
 */
export function createRoleSelectionDeck(): Array<{
  number: number;
  isSelected: boolean;
  selectedBy?: string;
}> {
  return DeckHelper.createRoleSelectionDeck();
}

/**
 * 카드를 정렬합니다.
 * - 조커는 맨 뒤로
 * - 나머지는 rank 오름차순
 *
 * @param cards - 정렬할 카드 배열
 * @returns 정렬된 카드 배열
 */
export function sortCards(
  cards: ReturnType<Card['toPlainObject']>[]
): ReturnType<Card['toPlainObject']>[] {
  return DeckHelper.sortCards(cards);
}

/**
 * 덱의 모든 카드를 정렬합니다 (in-place).
 *
 * @param deck - 정렬할 덱
 */
export function sortDeckCards(deck: SelectableDeck): void {
  DeckHelper.sortDeckCards(deck);
}

/**
 * 덱에서 특정 카드를 제거합니다.
 *
 * @param deck - 대상 덱
 * @param cardsToRemove - 제거할 카드 배열
 * @returns 카드가 제거된 새 덱
 */
export function removeCards(
  deck: ReturnType<Card['toPlainObject']>[],
  cardsToRemove: ReturnType<Card['toPlainObject']>[]
): ReturnType<Card['toPlainObject']>[] {
  return DeckHelper.removeCards(deck, cardsToRemove);
}

/**
 * 덱에 더블 조커가 있는지 확인합니다.
 *
 * @param cards - 확인할 카드 배열
 * @returns 조커가 2장 이상이면 true
 */
export function hasDoubleJoker(cards: ReturnType<Card['toPlainObject']>[]): boolean {
  return DeckHelper.hasDoubleJoker(cards);
}

/**
 * 덱의 카드 개수를 계산합니다.
 *
 * @param deck - 대상 덱
 * @returns 카드 개수
 */
export function countCards(deck: ReturnType<Card['toPlainObject']>[]): number {
  return DeckHelper.countCards(deck);
}

/**
 * 여러 덱의 총 카드 개수를 계산합니다.
 *
 * @param decks - 덱 배열
 * @returns 총 카드 개수
 */
export function countTotalCards(decks: SelectableDeck[]): number {
  return DeckHelper.countTotalCards(decks);
}
