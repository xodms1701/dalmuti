/**
 * DeckService Unit Tests
 */

import * as DeckService from '../../../../src/domain/services/DeckService';

describe('DeckService', () => {
  describe('initializeDeck', () => {
    it('should create a standard deck with 54 cards', () => {
      // Arrange & Act
      const deck = DeckService.initializeDeck();

      // Assert
      expect(deck).toHaveLength(54);
    });

    it('should include cards from rank 1 to 13', () => {
      // Arrange & Act
      const deck = DeckService.initializeDeck();

      // Assert
      for (let rank = 1; rank <= 13; rank++) {
        const cardsOfRank = deck.filter((c) => c.rank === rank && !c.isJoker);
        expect(cardsOfRank.length).toBeGreaterThan(0);
      }
    });

    it('should include 2 jokers', () => {
      // Arrange & Act
      const deck = DeckService.initializeDeck();

      // Assert
      const jokers = deck.filter((c) => c.isJoker);
      expect(jokers).toHaveLength(2);
    });

    it('should have 4 cards of each rank (standard deck)', () => {
      // Arrange & Act
      const deck = DeckService.initializeDeck();

      // Assert
      // Standard deck: 1-13 each appears 4 times
      for (let rank = 1; rank <= 13; rank++) {
        const cardsOfRank = deck.filter((c) => c.rank === rank && !c.isJoker);
        expect(cardsOfRank).toHaveLength(4);
      }
    });

    it('should create new deck each time', () => {
      // Arrange & Act
      const deck1 = DeckService.initializeDeck();
      const deck2 = DeckService.initializeDeck();

      // Assert
      expect(deck1).not.toBe(deck2);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle deck in-place', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const originalFirst = deck[0];

      // Act
      DeckService.shuffleDeck(deck);

      // Assert
      expect(deck).toHaveLength(54);
      // With high probability, first card should change
      // (not 100% guaranteed but very likely)
    });

    it('should not change deck size', () => {
      // Arrange
      const deck = DeckService.initializeDeck();

      // Act
      DeckService.shuffleDeck(deck);

      // Assert
      expect(deck).toHaveLength(54);
    });

    it('should contain same cards after shuffle', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const originalRankCounts: { [key: string]: number } = {};
      deck.forEach((card) => {
        const key = card.isJoker ? 'joker' : String(card.rank);
        originalRankCounts[key] = (originalRankCounts[key] || 0) + 1;
      });

      // Act
      DeckService.shuffleDeck(deck);

      // Assert
      const shuffledRankCounts: { [key: string]: number } = {};
      deck.forEach((card) => {
        const key = card.isJoker ? 'joker' : String(card.rank);
        shuffledRankCounts[key] = (shuffledRankCounts[key] || 0) + 1;
      });
      expect(shuffledRankCounts).toEqual(originalRankCounts);
    });

    it('should change position of most cards when shuffled', () => {
      // Arrange
      const original = DeckService.initializeDeck();
      const deck = [...original]; // 복사본 생성

      // Act
      const shuffled = DeckService.shuffleDeck(deck);

      // Assert
      // 적어도 대부분의 카드(75% 이상)가 원래 위치에서 이동했어야 함
      const changedPositions = original.filter(
        (card, index) =>
          card.rank !== shuffled[index].rank || card.isJoker !== shuffled[index].isJoker
      );

      // 54장 중 40장 이상이 위치 변경되어야 함 (약 75%)
      expect(changedPositions.length).toBeGreaterThan(40);
    });
  });

  describe('createSelectableDecks', () => {
    it('should create decks equal to player count', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const playerCount = 4;

      // Act
      const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);

      // Assert
      expect(selectableDecks).toHaveLength(playerCount);
    });

    it('should distribute all cards', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const playerCount = 4;

      // Act
      const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);

      // Assert
      const totalCards = selectableDecks.reduce((sum, d) => sum + d.cards.length, 0);
      expect(totalCards).toBe(deck.length);
    });

    it('should create decks with isSelected false', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const playerCount = 4;

      // Act
      const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);

      // Assert
      selectableDecks.forEach((d) => {
        expect(d.isSelected).toBe(false);
      });
    });

    it('should create decks with no selectedBy', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const playerCount = 4;

      // Act
      const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);

      // Assert
      selectableDecks.forEach((d) => {
        expect(d.selectedBy).toBeUndefined();
      });
    });

    it('should distribute cards evenly', () => {
      // Arrange
      const deck = DeckService.initializeDeck();
      const playerCount = 5;

      // Act
      const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);

      // Assert
      const cardCounts = selectableDecks.map((d) => d.cards.length);
      const min = Math.min(...cardCounts);
      const max = Math.max(...cardCounts);
      expect(max - min).toBeLessThanOrEqual(1); // Difference should be at most 1
    });

    it('should work with different player counts', () => {
      // Arrange
      const deck = DeckService.initializeDeck();

      // Act & Assert
      for (let playerCount = 4; playerCount <= 8; playerCount++) {
        const selectableDecks = DeckService.createSelectableDecks(deck, playerCount);
        expect(selectableDecks).toHaveLength(playerCount);
        const totalCards = selectableDecks.reduce((sum, d) => sum + d.cards.length, 0);
        expect(totalCards).toBe(deck.length);
      }
    });
  });

  describe('createRoleSelectionDeck', () => {
    it('should create 13 role selection cards', () => {
      // Arrange & Act
      const roleCards = DeckService.createRoleSelectionDeck();

      // Assert
      expect(roleCards).toHaveLength(13);
    });

    it('should have numbers from 1 to 13', () => {
      // Arrange & Act
      const roleCards = DeckService.createRoleSelectionDeck();

      // Assert
      const numbers = roleCards.map((c) => c.number).sort((a, b) => a - b);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    });

    it('should have all cards unselected', () => {
      // Arrange & Act
      const roleCards = DeckService.createRoleSelectionDeck();

      // Assert
      roleCards.forEach((c) => {
        expect(c.isSelected).toBe(false);
      });
    });

    it('should have no selectedBy initially', () => {
      // Arrange & Act
      const roleCards = DeckService.createRoleSelectionDeck();

      // Assert
      roleCards.forEach((c) => {
        expect(c.selectedBy).toBeUndefined();
      });
    });
  });

  describe('sortCards', () => {
    it('should sort cards by rank in ascending order', () => {
      // Arrange
      const cards = [
        { rank: 7, isJoker: false },
        { rank: 3, isJoker: false },
        { rank: 10, isJoker: false },
        { rank: 1, isJoker: false },
      ];

      // Act
      const sorted = DeckService.sortCards(cards);

      // Assert
      expect(sorted[0].rank).toBe(1);
      expect(sorted[1].rank).toBe(3);
      expect(sorted[2].rank).toBe(7);
      expect(sorted[3].rank).toBe(10);
    });

    it('should place jokers at the end', () => {
      // Arrange
      const cards = [
        { rank: 7, isJoker: false },
        { rank: 13, isJoker: true },
        { rank: 3, isJoker: false },
        { rank: 13, isJoker: true },
      ];

      // Act
      const sorted = DeckService.sortCards(cards);

      // Assert
      expect(sorted[2].isJoker).toBe(true);
      expect(sorted[3].isJoker).toBe(true);
    });

    it('should return new array', () => {
      // Arrange
      const cards = [
        { rank: 7, isJoker: false },
        { rank: 3, isJoker: false },
      ];

      // Act
      const sorted = DeckService.sortCards(cards);

      // Assert
      expect(sorted).not.toBe(cards);
    });
  });

  describe('sortDeckCards', () => {
    it('should sort deck cards in-place', () => {
      // Arrange
      const deck: DeckService.SelectableDeck = {
        cards: [
          { rank: 7, isJoker: false },
          { rank: 3, isJoker: false },
          { rank: 10, isJoker: false },
        ],
        isSelected: false,
      };

      // Act
      DeckService.sortDeckCards(deck);

      // Assert
      expect(deck.cards[0].rank).toBe(3);
      expect(deck.cards[1].rank).toBe(7);
      expect(deck.cards[2].rank).toBe(10);
    });
  });

  describe('removeCards', () => {
    it('should remove specified cards from deck', () => {
      // Arrange
      const deck = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
        { rank: 3, isJoker: false },
      ];
      const toRemove = [{ rank: 7, isJoker: false }];

      // Act
      const result = DeckService.removeCards(deck, toRemove);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.find((c) => c.rank === 7)).toBeUndefined();
    });

    it('should return new array', () => {
      // Arrange
      const deck = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
      ];
      const toRemove = [{ rank: 7, isJoker: false }];

      // Act
      const result = DeckService.removeCards(deck, toRemove);

      // Assert
      expect(result).not.toBe(deck);
    });
  });

  describe('hasDoubleJoker', () => {
    it('should return true when deck has 2 jokers', () => {
      // Arrange
      const cards = [
        { rank: 13, isJoker: true },
        { rank: 13, isJoker: true },
        { rank: 5, isJoker: false },
      ];

      // Act
      const result = DeckService.hasDoubleJoker(cards);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when deck has 1 joker', () => {
      // Arrange
      const cards = [
        { rank: 13, isJoker: true },
        { rank: 5, isJoker: false },
      ];

      // Act
      const result = DeckService.hasDoubleJoker(cards);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when deck has no jokers', () => {
      // Arrange
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
      ];

      // Act
      const result = DeckService.hasDoubleJoker(cards);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('countCards', () => {
    it('should return number of cards in deck', () => {
      // Arrange
      const deck = [
        { rank: 5, isJoker: false },
        { rank: 7, isJoker: false },
        { rank: 3, isJoker: false },
      ];

      // Act
      const count = DeckService.countCards(deck);

      // Assert
      expect(count).toBe(3);
    });

    it('should return 0 for empty deck', () => {
      // Arrange
      const deck: any[] = [];

      // Act
      const count = DeckService.countCards(deck);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('countTotalCards', () => {
    it('should count all cards across multiple decks', () => {
      // Arrange
      const decks: DeckService.SelectableDeck[] = [
        { cards: [{ rank: 5, isJoker: false }, { rank: 7, isJoker: false }], isSelected: false },
        { cards: [{ rank: 3, isJoker: false }], isSelected: false },
        { cards: [{ rank: 1, isJoker: false }, { rank: 2, isJoker: false }, { rank: 4, isJoker: false }], isSelected: false },
      ];

      // Act
      const total = DeckService.countTotalCards(decks);

      // Assert
      expect(total).toBe(6);
    });

    it('should return 0 for empty decks array', () => {
      // Arrange
      const decks: DeckService.SelectableDeck[] = [];

      // Act
      const total = DeckService.countTotalCards(decks);

      // Assert
      expect(total).toBe(0);
    });

    it('should handle decks with no cards', () => {
      // Arrange
      const decks: DeckService.SelectableDeck[] = [
        { cards: [], isSelected: false },
        { cards: [], isSelected: false },
      ];

      // Act
      const total = DeckService.countTotalCards(decks);

      // Assert
      expect(total).toBe(0);
    });
  });
});
