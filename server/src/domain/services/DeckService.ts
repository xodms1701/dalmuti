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
import { SelectableDeck } from '../types/GameTypes';

/**
 * 위대한 달무티 게임용 덱을 초기화합니다.
 * - 1번 카드 1장, 2번 카드 2장, ..., 12번 카드 12장
 * - 조커 2장
 * - 총 80장 (1+2+3+...+12 + 2 = 78 + 2 = 80)
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
 * 개발 환경에서 테스트를 위한 백도어: 조커 2장을 덱의 맨 앞으로 이동합니다.
 * 이렇게 하면 첫 번째 플레이어가 조커 2장을 받아서 혁명 기능을 쉽게 테스트할 수 있습니다.
 *
 * @param deck - 수정할 덱
 * @returns 조커 2장이 맨 앞에 있는 새로운 덱
 */
export function applyTestBackdoor(
  deck: ReturnType<Card['toPlainObject']>[]
): ReturnType<Card['toPlainObject']>[] {
  const jokers = deck.filter((card) => card.isJoker);
  const otherCards = deck.filter((card) => !card.isJoker);

  // 조커가 2장 이상 있는 경우에만 적용 (달무티 기본 규칙)
  if (jokers.length >= 2) {
    // eslint-disable-next-line no-console
    console.log('[TEST BACKDOOR] Jokers placed at the front of the deck');
    return [...jokers, ...otherCards];
  }

  return deck;
}

/**
 * 플레이어 수에 맞게 선택 가능한 덱을 생성합니다.
 * - 카드를 균등하게 배분
 * - 남은 카드는 순서대로 배분
 * - 각 덱의 카드를 정렬
 *
 * @param deck - 배분할 전체 카드 배열 (Card[] 또는 plain object[])
 * @param playerCount - 플레이어 수
 * @returns 선택 가능한 덱 배열
 */
export function createSelectableDecks(
  deck: Card[] | ReturnType<Card['toPlainObject']>[],
  playerCount: number
): SelectableDeck[] {
  // Card[] 인 경우 plain object로 변환
  const plainDeck = Array.isArray(deck) && deck.length > 0 && typeof (deck[0] as any).toPlainObject === 'function'
    ? (deck as Card[]).map(c => c.toPlainObject())
    : (deck as ReturnType<Card['toPlainObject']>[]);

  // 기존 헬퍼 함수 사용 (plain object 형태의 SelectableDeck 반환)
  const plainDecks = DeckHelper.createSelectableDecks(plainDeck, playerCount);

  // Card 엔티티를 사용하는 SelectableDeck으로 변환
  return plainDecks.map(deck => ({
    cards: deck.cards.map(cardData => Card.fromPlainObject(cardData)),
    isSelected: deck.isSelected,
    selectedBy: deck.selectedBy,
  }));
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
