/**
 * TaxService.ts
 *
 * 세금 교환 도메인 서비스
 * 게임 진행 중 순위에 따른 세금 교환 로직을 담당
 *
 * 세금 교환 규칙:
 * - 4명: 1위 ↔ 4위 2장씩
 * - 5명 이상: 1위 ↔ 꼴찌 2장씩, 2위 ↔ 차하위 1장씩
 *
 * 세금 카드 선택 규칙:
 * - 높은 순위(1, 2등): 큰 숫자 카드(rank가 높은 값, 약한 카드)를 줌
 * - 낮은 순위(꼴찌, 차하위): 작은 숫자 카드(rank가 낮은 값, 강한 카드)를 줌
 */

import { Card } from '../entities/Card';
import { Player } from '../entities/Player';
import { TaxExchange } from '../types/GameTypes';

/**
 * 세금으로 줄 카드를 자동으로 선택합니다.
 * @param cards 플레이어의 카드 목록
 * @param count 선택할 카드 개수
 * @param selectLargest true: 큰 숫자 카드(약한 카드) 선택, false: 작은 숫자 카드(강한 카드) 선택
 * @returns 선택된 카드 배열
 */
export function selectTaxCardsAutomatically(
  cards: Card[],
  count: number,
  selectLargest: boolean
): Card[] {
  // 조커가 아닌 카드만 필터링 (조커는 세금으로 줄 수 없음)
  const nonJokerCards = cards.filter((card) => !card.isJoker);

  // 카드를 복사하여 정렬
  const sortedCards = nonJokerCards.slice().sort((a, b) => {
    if (selectLargest) {
      // 큰 숫자 카드 우선 (약한 카드)
      return b.rank - a.rank;
    }
    // 작은 숫자 카드 우선 (강한 카드)
    return a.rank - b.rank;
  });

  // 상위 count개 선택
  return sortedCards.slice(0, count);
}

/**
 * 게임의 세금 교환을 초기화하고 자동으로 수행합니다.
 * @param players 게임의 모든 플레이어 (rank 순으로 정렬되어야 함)
 * @returns 세금 교환 정보 배열
 */
export function initializeTaxExchanges(players: Player[]): TaxExchange[] {
  const playerCount = players.length;

  // rank 순으로 정렬 (1등, 2등, ..., 꼴찌)
  const sortedPlayers = players.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const exchangePairs: Array<{ fromIdx: number; toIdx: number; count: number }> = [];

  if (playerCount === 4) {
    // 4명: 1위 ↔ 4위 2장씩
    exchangePairs.push(
      { fromIdx: 3, toIdx: 0, count: 2 }, // 4위 → 1위
      { fromIdx: 0, toIdx: 3, count: 2 } // 1위 → 4위
    );
  } else if (playerCount >= 5) {
    // 5명 이상: 1위 ↔ 꼴찌 2장씩, 2위 ↔ 차하위 1장씩
    exchangePairs.push(
      { fromIdx: playerCount - 1, toIdx: 0, count: 2 }, // 꼴찌 → 1위
      { fromIdx: 0, toIdx: playerCount - 1, count: 2 }, // 1위 → 꼴찌
      { fromIdx: playerCount - 2, toIdx: 1, count: 1 }, // 차하위 → 2위
      { fromIdx: 1, toIdx: playerCount - 2, count: 1 } // 2위 → 차하위
    );
  }

  // Step 1: 각 플레이어가 줄 카드를 미리 결정
  const cardsToGiveByPlayer = new Map<string, Card[]>();
  for (const pair of exchangePairs) {
    const fromPlayer = sortedPlayers[pair.fromIdx];
    if (!cardsToGiveByPlayer.has(fromPlayer.id.value)) {
      const cardsToGive = selectTaxCardsAutomatically(
        fromPlayer.cards,
        pair.count,
        pair.fromIdx <= 1 // 높은 순위(1, 2등)는 큰 카드를 줌
      );
      cardsToGiveByPlayer.set(fromPlayer.id.value, cardsToGive);
    }
  }

  // Step 2: 모든 카드 교환 실행
  for (const pair of exchangePairs) {
    const fromPlayer = sortedPlayers[pair.fromIdx];
    const toPlayer = sortedPlayers[pair.toIdx];
    const cardsGiven = cardsToGiveByPlayer.get(fromPlayer.id.value) || [];

    // 카드 제거
    cardsGiven.forEach((card) => {
      fromPlayer.removeCard(card);
    });

    // 카드 추가
    toPlayer.addCards(cardsGiven);
  }

  // Step 3: UI용 교환 기록 생성
  const taxExchanges: TaxExchange[] = exchangePairs.map((pair) => {
    const fromPlayer = sortedPlayers[pair.fromIdx];
    const toPlayer = sortedPlayers[pair.toIdx];

    const cardsGiven = cardsToGiveByPlayer.get(fromPlayer.id.value) || [];

    return {
      fromPlayerId: fromPlayer.id.value,
      toPlayerId: toPlayer.id.value,
      cardCount: pair.count,
      cardsGiven: cardsGiven.map((c) => c.toPlainObject()),
    };
  });

  return taxExchanges;
}
