/**
 * DeckHelper.test.ts
 *
 * DeckHelper 헬퍼 함수들의 단위 테스트
 */

import {
  sortCards,
  sortDeckCards,
  createSelectableDecks,
  createStandardDeck,
  shuffleDeck,
  createRoleSelectionDeck,
  removeCards,
  hasDoubleJoker,
  countCards,
  countTotalCards,
  SelectableDeck,
} from '../../game/helpers/DeckHelper';
import { Card } from '../../types';
import { createCard, createJoker } from './testHelpers';

describe('DeckHelper', () => {
  describe('sortCards', () => {
    it('카드를 rank 오름차순으로 정렬해야 함', () => {
      const cards = [createCard(5), createCard(1), createCard(3)];

      const sorted = sortCards(cards);

      expect(sorted[0].rank).toBe(1);
      expect(sorted[1].rank).toBe(3);
      expect(sorted[2].rank).toBe(5);
    });

    it('조커를 맨 뒤로 정렬해야 함', () => {
      const cards = [createJoker(), createCard(5), createCard(1)];

      const sorted = sortCards(cards);

      expect(sorted[0].rank).toBe(1);
      expect(sorted[1].rank).toBe(5);
      expect(sorted[2].isJoker).toBe(true);
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const cards = [createCard(5), createCard(1)];

      sortCards(cards);

      expect(cards[0].rank).toBe(5);
    });
  });

  describe('sortDeckCards', () => {
    it('덱의 카드를 정렬해야 함 (in-place)', () => {
      const deck: SelectableDeck = {
        cards: [createCard(5), createJoker(), createCard(1)],
        isSelected: false,
      };

      sortDeckCards(deck);

      expect(deck.cards[0].rank).toBe(1);
      expect(deck.cards[1].rank).toBe(5);
      expect(deck.cards[2].isJoker).toBe(true);
    });
  });

  describe('createSelectableDecks', () => {
    it('카드를 균등하게 배분해야 함', () => {
      const cards = [
        createCard(1),
        createCard(2),
        createCard(3),
        createCard(4),
        createCard(5),
        createCard(6),
      ];

      const decks = createSelectableDecks(cards, 3);

      expect(decks.length).toBe(3);
      expect(decks[0].cards.length).toBe(2);
      expect(decks[1].cards.length).toBe(2);
      expect(decks[2].cards.length).toBe(2);
    });

    it('남은 카드를 순서대로 배분해야 함', () => {
      const cards = [createCard(1), createCard(2), createCard(3), createCard(4), createCard(5)];

      const decks = createSelectableDecks(cards, 3);

      expect(decks.length).toBe(3);
      expect(decks[0].cards.length).toBe(2); // 1, 2
      expect(decks[1].cards.length).toBe(2); // 3, 4
      expect(decks[2].cards.length).toBe(1); // 5
    });

    it('각 덱의 카드를 정렬해야 함', () => {
      const cards = [
        createCard(5),
        createCard(1),
        createJoker(),
        createCard(3),
        createCard(2),
        createCard(4),
      ];

      const decks = createSelectableDecks(cards, 3);

      // 각 덱의 첫 번째 카드가 가장 작은 rank여야 함
      decks.forEach((deck) => {
        for (let i = 1; i < deck.cards.length; i++) {
          if (!deck.cards[i].isJoker) {
            expect(deck.cards[i - 1].rank).toBeLessThanOrEqual(deck.cards[i].rank);
          }
        }
      });
    });

    it('플레이어 수가 0 이하면 에러를 던져야 함', () => {
      const cards = [createCard(1)];

      expect(() => createSelectableDecks(cards, 0)).toThrow('Player count must be greater than 0');
      expect(() => createSelectableDecks(cards, -1)).toThrow('Player count must be greater than 0');
    });

    it('카드가 없으면 에러를 던져야 함', () => {
      expect(() => createSelectableDecks([], 3)).toThrow(
        'Cannot create decks from empty card array'
      );
    });

    it('모든 덱의 isSelected가 false여야 함', () => {
      const cards = [createCard(1), createCard(2), createCard(3)];

      const decks = createSelectableDecks(cards, 3);

      decks.forEach((deck) => {
        expect(deck.isSelected).toBe(false);
      });
    });
  });

  describe('createStandardDeck', () => {
    it('54장의 카드를 생성해야 함', () => {
      const deck = createStandardDeck();

      expect(deck.length).toBe(54); // 52 + 2 조커
    });

    it('각 숫자가 4장씩 있어야 함', () => {
      const deck = createStandardDeck();

      for (let rank = 1; rank <= 13; rank++) {
        const count = deck.filter((c) => c.rank === rank && !c.isJoker).length;
        expect(count).toBe(4);
      }
    });

    it('조커가 2장 있어야 함', () => {
      const deck = createStandardDeck();

      const jokerCount = deck.filter((c) => c.isJoker).length;
      expect(jokerCount).toBe(2);
    });
  });

  describe('shuffleDeck', () => {
    it('같은 개수의 카드를 반환해야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];

      const shuffled = shuffleDeck(deck);

      expect(shuffled.length).toBe(deck.length);
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];
      const original = [...deck];

      shuffleDeck(deck);

      expect(deck).toEqual(original);
    });

    it('같은 카드들을 포함해야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];

      const shuffled = shuffleDeck(deck);

      deck.forEach((card) => {
        const found = shuffled.find((c) => c.rank === card.rank && c.isJoker === card.isJoker);
        expect(found).toBeDefined();
      });
    });

    // 확률적 테스트: 큰 덱을 여러 번 섞으면 다른 결과가 나와야 함
    it('여러 번 섞으면 다른 순서가 나와야 함', () => {
      const deck = createStandardDeck();

      const shuffled1 = shuffleDeck(deck);
      const shuffled2 = shuffleDeck(deck);

      // 적어도 하나의 위치에서 다른 카드여야 함
      const isDifferent = shuffled1.some(
        (card, index) =>
          card.rank !== shuffled2[index].rank || card.isJoker !== shuffled2[index].isJoker
      );

      expect(isDifferent).toBe(true);
    });
  });

  describe('createRoleSelectionDeck', () => {
    it('13장의 역할 카드를 생성해야 함', () => {
      const deck = createRoleSelectionDeck();

      expect(deck.length).toBe(13);
    });

    it('1부터 13까지의 숫자가 모두 있어야 함', () => {
      const deck = createRoleSelectionDeck();

      for (let i = 1; i <= 13; i++) {
        const found = deck.find((card) => card.number === i);
        expect(found).toBeDefined();
      }
    });

    it('모든 카드의 isSelected가 false여야 함', () => {
      const deck = createRoleSelectionDeck();

      deck.forEach((card) => {
        expect(card.isSelected).toBe(false);
      });
    });

    it('여러 번 호출하면 다른 순서가 나와야 함', () => {
      const deck1 = createRoleSelectionDeck();
      const deck2 = createRoleSelectionDeck();

      const isDifferent = deck1.some((card, index) => card.number !== deck2[index].number);

      expect(isDifferent).toBe(true);
    });
  });

  describe('removeCards', () => {
    it('지정된 카드를 제거해야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];
      const toRemove = [createCard(2)];

      const result = removeCards(deck, toRemove);

      expect(result.length).toBe(2);
      expect(result.find((c) => c.rank === 2)).toBeUndefined();
    });

    it('여러 카드를 제거해야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3), createCard(4)];
      const toRemove = [createCard(2), createCard(4)];

      const result = removeCards(deck, toRemove);

      expect(result.length).toBe(2);
      expect(result.find((c) => c.rank === 2)).toBeUndefined();
      expect(result.find((c) => c.rank === 4)).toBeUndefined();
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];
      const toRemove = [createCard(2)];

      removeCards(deck, toRemove);

      expect(deck.length).toBe(3);
    });

    it('없는 카드를 제거하려 해도 에러가 나지 않아야 함', () => {
      const deck = [createCard(1), createCard(2)];
      const toRemove = [createCard(5)];

      const result = removeCards(deck, toRemove);

      expect(result.length).toBe(2);
    });
  });

  describe('hasDoubleJoker', () => {
    it('조커가 2장 있으면 true를 반환해야 함', () => {
      const cards = [createJoker(), createJoker(), createCard(1)];

      expect(hasDoubleJoker(cards)).toBe(true);
    });

    it('조커가 2장 이상 있으면 true를 반환해야 함', () => {
      const cards = [createJoker(), createJoker(), createJoker()];

      expect(hasDoubleJoker(cards)).toBe(true);
    });

    it('조커가 1장만 있으면 false를 반환해야 함', () => {
      const cards = [createJoker(), createCard(1), createCard(2)];

      expect(hasDoubleJoker(cards)).toBe(false);
    });

    it('조커가 없으면 false를 반환해야 함', () => {
      const cards = [createCard(1), createCard(2), createCard(3)];

      expect(hasDoubleJoker(cards)).toBe(false);
    });
  });

  describe('countCards', () => {
    it('카드 개수를 반환해야 함', () => {
      const deck = [createCard(1), createCard(2), createCard(3)];

      expect(countCards(deck)).toBe(3);
    });

    it('빈 덱이면 0을 반환해야 함', () => {
      expect(countCards([])).toBe(0);
    });
  });

  describe('countTotalCards', () => {
    it('여러 덱의 총 카드 개수를 반환해야 함', () => {
      const decks: SelectableDeck[] = [
        { cards: [createCard(1), createCard(2)], isSelected: false },
        { cards: [createCard(3), createCard(4), createCard(5)], isSelected: false },
        { cards: [createCard(6)], isSelected: false },
      ];

      expect(countTotalCards(decks)).toBe(6);
    });

    it('빈 덱 배열이면 0을 반환해야 함', () => {
      expect(countTotalCards([])).toBe(0);
    });
  });
});
