/**
 * DeckHelper.ts
 *
 * 카드 덱 관리 헬퍼 함수들
 * selectRole과 vote에서 중복되는 카드 배분 및 정렬 로직을 통합합니다.
 */

import { Card } from '../../types';

/**
 * 선택 가능한 덱 타입
 */
export interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;
  selectedBy?: string;
}

/**
 * 카드를 정렬합니다.
 * - 조커는 맨 뒤로
 * - 나머지는 rank 오름차순
 *
 * @param cards - 정렬할 카드 배열
 * @returns 정렬된 카드 배열
 *
 * @example
 * const sorted = sortCards([joker, card5, card1]);
 * // [card1, card5, joker]
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1; // 조커는 뒤로
    if (!a.isJoker && b.isJoker) return -1; // 조커는 뒤로
    return a.rank - b.rank; // rank 오름차순
  });
}

/**
 * 덱의 모든 카드를 정렬합니다 (in-place).
 *
 * @param deck - 정렬할 덱
 *
 * @example
 * sortDeckCards(deck);
 * // deck.cards가 정렬됨
 */
export function sortDeckCards(deck: SelectableDeck): void {
  deck.cards.sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    return a.rank - b.rank;
  });
}

/**
 * 플레이어 수에 맞게 선택 가능한 덱을 생성합니다.
 * - 카드를 균등하게 배분
 * - 남은 카드는 순서대로 배분
 * - 각 덱의 카드를 정렬
 *
 * @param allCards - 배분할 전체 카드 배열
 * @param playerCount - 플레이어 수
 * @returns 선택 가능한 덱 배열
 *
 * @example
 * const decks = createSelectableDecks(game.deck, game.players.length);
 * game.selectableDecks = decks;
 */
export function createSelectableDecks(allCards: Card[], playerCount: number): SelectableDeck[] {
  if (playerCount <= 0) {
    throw new Error('Player count must be greater than 0');
  }

  if (allCards.length === 0) {
    throw new Error('Cannot create decks from empty card array');
  }

  const cardsPerPlayer = Math.floor(allCards.length / playerCount);
  const remainingCards = allCards.length % playerCount;

  const selectableDecks: SelectableDeck[] = [];

  // 각 플레이어에게 동일한 수의 카드 배분
  for (let i = 0; i < playerCount; i++) {
    const startIndex = i * cardsPerPlayer;
    const endIndex = startIndex + cardsPerPlayer;
    selectableDecks.push({
      cards: allCards.slice(startIndex, endIndex),
      isSelected: false,
    });
  }

  // 남은 카드가 있다면 순서대로 배분
  if (remainingCards > 0) {
    for (let i = 0; i < remainingCards; i++) {
      const cardIndex = playerCount * cardsPerPlayer + i;
      selectableDecks[i].cards.push(allCards[cardIndex]);
    }
  }

  // 모든 덱의 카드 정렬
  for (const deck of selectableDecks) {
    sortDeckCards(deck);
  }

  return selectableDecks;
}

/**
 * 표준 52장 + 조커 2장 덱을 생성합니다.
 * 각 숫자(1-13)가 4장씩 있고, 조커가 2장 있습니다.
 *
 * @returns 섞인 카드 덱
 *
 * @example
 * const deck = createStandardDeck();
 * // 54장의 카드 (1-13 각 4장 + 조커 2장)
 */
export function createStandardDeck(): Card[] {
  const deck: Card[] = [];

  // 1부터 13까지 각 4장씩
  for (let rank = 1; rank <= 13; rank++) {
    for (let i = 0; i < 4; i++) {
      deck.push({ rank, isJoker: false });
    }
  }

  // 조커 2장 추가
  deck.push({ rank: 13, isJoker: true });
  deck.push({ rank: 13, isJoker: true });

  return deck;
}

/**
 * 덱을 섞습니다 (Fisher-Yates 알고리즘).
 *
 * @param deck - 섞을 덱
 * @returns 섞인 덱 (새 배열)
 *
 * @example
 * const shuffled = shuffleDeck(deck);
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 역할 선택용 덱을 생성합니다.
 * 1부터 13까지의 숫자 카드를 섞어서 반환합니다.
 *
 * @returns 역할 선택 카드 배열
 *
 * @example
 * const roleCards = createRoleSelectionDeck();
 * // [{number: 5, isSelected: false}, ...]
 */
export function createRoleSelectionDeck(): Array<{
  number: number;
  isSelected: boolean;
  selectedBy?: string;
}> {
  const numbers = Array.from({ length: 13 }, (_, i) => i + 1);
  const shuffled = shuffleDeck(numbers);

  return shuffled.map((number) => ({
    number,
    isSelected: false,
  }));
}

/**
 * 덱에서 특정 카드를 제거합니다.
 *
 * @param deck - 대상 덱
 * @param cardsToRemove - 제거할 카드 배열
 * @returns 카드가 제거된 새 덱
 *
 * @example
 * const newDeck = removeCards(deck, [card1, card2]);
 */
export function removeCards(deck: Card[], cardsToRemove: Card[]): Card[] {
  const result = [...deck];

  for (const cardToRemove of cardsToRemove) {
    const index = result.findIndex(
      (c) => c.rank === cardToRemove.rank && c.isJoker === cardToRemove.isJoker
    );
    if (index !== -1) {
      result.splice(index, 1);
    }
  }

  return result;
}

/**
 * 덱에 더블 조커가 있는지 확인합니다.
 *
 * @param cards - 확인할 카드 배열
 * @returns 조커가 2장 이상이면 true
 *
 * @example
 * if (hasDoubleJoker(player.cards)) {
 *   // 혁명 가능
 * }
 */
export function hasDoubleJoker(cards: Card[]): boolean {
  const jokerCount = cards.filter((c) => c.isJoker).length;
  return jokerCount >= 2;
}

/**
 * 덱에서 카드 개수를 계산합니다.
 *
 * @param deck - 대상 덱
 * @returns 카드 개수
 */
export function countCards(deck: Card[]): number {
  return deck.length;
}

/**
 * 여러 덱의 총 카드 개수를 계산합니다.
 *
 * @param decks - 덱 배열
 * @returns 총 카드 개수
 */
export function countTotalCards(decks: SelectableDeck[]): number {
  return decks.reduce((total, deck) => total + deck.cards.length, 0);
}
