/**
 * TaxService Unit Tests
 */

import { Card, Player } from '../../../../src/domain/entities';
import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';
import * as TaxService from '../../../../src/domain/services/TaxService';

/**
 * 테스트용 Helper: Player를 카드와 rank와 함께 생성
 */
function createPlayerWithCards(id: string, nickname: string, cards: Card[], rank: number): Player {
  const player = Player.create(PlayerId.create(id), nickname);
  player.assignCards(cards);
  player.assignRank(rank);
  return player;
}

describe('TaxService', () => {
  describe('selectTaxCardsAutomatically', () => {
    it('큰 숫자 카드(약한 카드)를 우선 선택해야 함 (selectLargest=true)', () => {
      // Arrange
      const cards = [
        Card.create(3),
        Card.create(7),
        Card.create(1),
        Card.create(10),
        Card.create(5),
      ];

      // Act
      const selected = TaxService.selectTaxCardsAutomatically(cards, 2, true);

      // Assert
      expect(selected).toHaveLength(2);
      expect(selected[0].rank).toBe(10);
      expect(selected[1].rank).toBe(7);
    });

    it('작은 숫자 카드(강한 카드)를 우선 선택해야 함 (selectLargest=false)', () => {
      // Arrange
      const cards = [
        Card.create(3),
        Card.create(7),
        Card.create(1),
        Card.create(10),
        Card.create(5),
      ];

      // Act
      const selected = TaxService.selectTaxCardsAutomatically(cards, 2, false);

      // Assert
      expect(selected).toHaveLength(2);
      expect(selected[0].rank).toBe(1);
      expect(selected[1].rank).toBe(3);
    });

    it('조커는 세금으로 줄 수 없으므로 제외하고 선택해야 함', () => {
      // Arrange
      const cards = [
        Card.create(1),
        Card.create(5),
        Card.create(13, true), // 조커 (세금으로 줄 수 없음)
        Card.create(10),
      ];

      // Act - 큰 카드 선택 (조커 제외)
      const selected = TaxService.selectTaxCardsAutomatically(cards, 2, true);

      // Assert
      expect(selected).toHaveLength(2);
      expect(selected[0].isJoker).toBe(false); // 조커는 선택되지 않음
      expect(selected[0].rank).toBe(10); // 가장 큰 일반 카드
      expect(selected[1].rank).toBe(5);
    });

    it('요청된 count만큼만 카드를 선택해야 함', () => {
      // Arrange
      const cards = [Card.create(1), Card.create(5), Card.create(7), Card.create(10)];

      // Act
      const selected = TaxService.selectTaxCardsAutomatically(cards, 1, true);

      // Assert
      expect(selected).toHaveLength(1);
      expect(selected[0].rank).toBe(10);
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      // Arrange
      const cards = [Card.create(3), Card.create(1), Card.create(5)];
      const originalLength = cards.length;

      // Act
      TaxService.selectTaxCardsAutomatically(cards, 2, true);

      // Assert
      expect(cards).toHaveLength(originalLength);
    });
  });

  describe('initializeTaxExchanges', () => {
    describe('4명 플레이어', () => {
      it('1위와 4위가 2장씩 교환해야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards(
            'player1',
            'Player1',
            [Card.create(1), Card.create(2), Card.create(10), Card.create(11)],
            1
          ),
          createPlayerWithCards('player2', 'Player2', [Card.create(3), Card.create(4)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(5), Card.create(6)], 3),
          createPlayerWithCards(
            'player4',
            'Player4',
            [Card.create(7), Card.create(8), Card.create(9), Card.create(12)],
            4
          ),
        ];

        const player1InitialCardCount = players[0].cards.length;
        const player4InitialCardCount = players[3].cards.length;

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(2);

        // 4위 → 1위 교환 확인
        const fromLastToFirst = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player4' && ex.toPlayerId === 'player1'
        );
        expect(fromLastToFirst).toBeDefined();
        expect(fromLastToFirst?.cardCount).toBe(2);
        expect(fromLastToFirst?.cardsGiven).toHaveLength(2);

        // 1위 → 4위 교환 확인
        const fromFirstToLast = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player4'
        );
        expect(fromFirstToLast).toBeDefined();
        expect(fromFirstToLast?.cardCount).toBe(2);
        expect(fromFirstToLast?.cardsGiven).toHaveLength(2);

        // 플레이어 카드 개수가 동일해야 함
        expect(players[0].cards.length).toBe(player1InitialCardCount);
        expect(players[3].cards.length).toBe(player4InitialCardCount);
      });

      it('1등은 큰 숫자 카드를, 4등은 작은 숫자 카드를 주어야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards(
            'player1',
            'Player1',
            [Card.create(1), Card.create(2), Card.create(10), Card.create(11)],
            1
          ),
          createPlayerWithCards('player2', 'Player2', [Card.create(3)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(4)], 3),
          createPlayerWithCards(
            'player4',
            'Player4',
            [Card.create(5), Card.create(6), Card.create(12), Card.create(13)],
            4
          ),
        ];

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        const fromFirstToLast = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player4'
        );
        // 1등은 큰 숫자(약한) 카드를 줌
        expect(fromFirstToLast?.cardsGiven[0].rank).toBeGreaterThanOrEqual(10);
        expect(fromFirstToLast?.cardsGiven[1].rank).toBeGreaterThanOrEqual(10);

        const fromLastToFirst = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player4' && ex.toPlayerId === 'player1'
        );
        // 4등은 작은 숫자(강한) 카드를 줌
        expect(fromLastToFirst?.cardsGiven[0].rank).toBeLessThanOrEqual(6);
        expect(fromLastToFirst?.cardsGiven[1].rank).toBeLessThanOrEqual(6);
      });
    });

    describe('5명 이상 플레이어', () => {
      it('5명: 1위↔꼴찌 2장, 2위↔차하위 1장 교환해야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards(
            'player1',
            'Player1',
            [Card.create(1), Card.create(2), Card.create(10)],
            1
          ),
          createPlayerWithCards('player2', 'Player2', [Card.create(3), Card.create(11)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(4)], 3),
          createPlayerWithCards('player4', 'Player4', [Card.create(5), Card.create(12)], 4),
          createPlayerWithCards(
            'player5',
            'Player5',
            [Card.create(6), Card.create(7), Card.create(13)],
            5
          ),
        ];

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(4);

        // 5위 → 1위 2장
        const from5to1 = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player5' && ex.toPlayerId === 'player1'
        );
        expect(from5to1).toBeDefined();
        expect(from5to1?.cardCount).toBe(2);

        // 1위 → 5위 2장
        const from1to5 = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player5'
        );
        expect(from1to5).toBeDefined();
        expect(from1to5?.cardCount).toBe(2);

        // 4위 → 2위 1장
        const from4to2 = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player4' && ex.toPlayerId === 'player2'
        );
        expect(from4to2).toBeDefined();
        expect(from4to2?.cardCount).toBe(1);

        // 2위 → 4위 1장
        const from2to4 = taxExchanges.find(
          (ex) => ex.fromPlayerId === 'player2' && ex.toPlayerId === 'player4'
        );
        expect(from2to4).toBeDefined();
        expect(from2to4?.cardCount).toBe(1);
      });

      it('6명 플레이어도 동일한 규칙이 적용되어야 함', () => {
        // Arrange
        const players = Array.from({ length: 6 }, (_, i) =>
          createPlayerWithCards(
            `player${i + 1}`,
            `Player${i + 1}`,
            [Card.create(i + 1), Card.create((i + 2) % 13 || 13), Card.create((i + 7) % 13 || 13)],
            i + 1
          )
        );

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(4);

        // 1위 ↔ 6위 2장씩
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player6' && ex.toPlayerId === 'player1')
        ).toBeDefined();
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player6')
        ).toBeDefined();

        // 2위 ↔ 5위 1장씩
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player5' && ex.toPlayerId === 'player2')
        ).toBeDefined();
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player2' && ex.toPlayerId === 'player5')
        ).toBeDefined();
      });

      it('8명 플레이어도 동일한 규칙이 적용되어야 함', () => {
        // Arrange
        const players = Array.from({ length: 8 }, (_, i) =>
          createPlayerWithCards(
            `player${i + 1}`,
            `Player${i + 1}`,
            [
              Card.create((i % 13) + 1),
              Card.create(((i + 1) % 13) + 1),
              Card.create(((i + 5) % 13) + 1),
            ],
            i + 1
          )
        );

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(4);

        // 1위 ↔ 8위 2장씩
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player8' && ex.toPlayerId === 'player1')
        ).toBeDefined();
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player8')
        ).toBeDefined();

        // 2위 ↔ 7위 1장씩
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player7' && ex.toPlayerId === 'player2')
        ).toBeDefined();
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player2' && ex.toPlayerId === 'player7')
        ).toBeDefined();
      });
    });

    describe('카드 교환 검증', () => {
      it('플레이어의 실제 카드가 교환되어야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards(
            'player1',
            'Player1',
            [Card.create(1), Card.create(2), Card.create(10), Card.create(11)],
            1
          ),
          createPlayerWithCards('player2', 'Player2', [Card.create(3)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(4)], 3),
          createPlayerWithCards(
            'player4',
            'Player4',
            [Card.create(5), Card.create(6), Card.create(12), Card.create(13)],
            4
          ),
        ];

        // Act
        TaxService.initializeTaxExchanges(players);

        // Assert
        const player1 = players[0];
        const player4 = players[3];

        // 1등은 큰 카드(10, 11)를 주고 작은 카드(5, 6)를 받아야 함
        expect(player1.cards.some((c) => c.rank === 5)).toBe(true);
        expect(player1.cards.some((c) => c.rank === 6)).toBe(true);
        expect(player1.cards.some((c) => c.rank === 10)).toBe(false);
        expect(player1.cards.some((c) => c.rank === 11)).toBe(false);

        // 4등은 작은 카드(5, 6)를 주고 큰 카드(10, 11)를 받아야 함
        expect(player4.cards.some((c) => c.rank === 10)).toBe(true);
        expect(player4.cards.some((c) => c.rank === 11)).toBe(true);
        expect(player4.cards.some((c) => c.rank === 5)).toBe(false);
        expect(player4.cards.some((c) => c.rank === 6)).toBe(false);
      });

      it('교환 후 플레이어의 총 카드 개수는 변하지 않아야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards(
            'player1',
            'Player1',
            [Card.create(1), Card.create(2), Card.create(10)],
            1
          ),
          createPlayerWithCards('player2', 'Player2', [Card.create(3)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(4)], 3),
          createPlayerWithCards(
            'player4',
            'Player4',
            [Card.create(5), Card.create(6), Card.create(12)],
            4
          ),
        ];

        const initialCounts = players.map((p) => p.cards.length);

        // Act
        TaxService.initializeTaxExchanges(players);

        // Assert
        players.forEach((player, idx) => {
          expect(player.cards.length).toBe(initialCounts[idx]);
        });
      });
    });

    describe('예외 케이스', () => {
      it('플레이어가 3명 이하면 빈 배열을 반환해야 함', () => {
        // Arrange
        const players = [
          createPlayerWithCards('player1', 'Player1', [Card.create(1)], 1),
          createPlayerWithCards('player2', 'Player2', [Card.create(2)], 2),
          createPlayerWithCards('player3', 'Player3', [Card.create(3)], 3),
        ];

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(0);
      });

      it('rank가 정렬되지 않은 플레이어도 올바르게 처리해야 함', () => {
        // Arrange - rank 순서가 뒤섞인 플레이어
        const players = [
          createPlayerWithCards('player3', 'Player3', [Card.create(4)], 3),
          createPlayerWithCards('player1', 'Player1', [Card.create(1), Card.create(10)], 1),
          createPlayerWithCards('player4', 'Player4', [Card.create(5), Card.create(12)], 4),
          createPlayerWithCards('player2', 'Player2', [Card.create(3)], 2),
        ];

        // Act
        const taxExchanges = TaxService.initializeTaxExchanges(players);

        // Assert
        expect(taxExchanges).toHaveLength(2);

        // 올바른 플레이어 간 교환이 이루어져야 함
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player4' && ex.toPlayerId === 'player1')
        ).toBeDefined();
        expect(
          taxExchanges.find((ex) => ex.fromPlayerId === 'player1' && ex.toPlayerId === 'player4')
        ).toBeDefined();
      });
    });
  });
});
