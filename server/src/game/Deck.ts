import { Card } from './types';

export class Deck {
    private cards: Card[];

    constructor() {
        this.cards = [];
        this.initializeDeck();
    }

    private initializeDeck(): void {
        // 1부터 12까지의 카드 생성 (각 숫자별로 해당 숫자만큼의 카드)
        for (let rank = 1; rank <= 12; rank++) {
            for (let i = 0; i < rank; i++) {
                this.cards.push({ rank, suit: 'spade' });
            }
        }

        // 조커 카드 (13) 2장 추가
        for (let i = 0; i < 2; i++) {
            this.cards.push({ rank: 13, suit: 'joker' });
        }
    }

    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    drawCard(): Card | null {
        return this.cards.pop() || null;
    }

    deal(numPlayers: number): Card[][] {
        const hands: Card[][] = Array(numPlayers).fill(null).map(() => []);
        let currentPlayer = 0;

        // 조커 카드가 같은 플레이어에게 분배되는지 확인
        const jokerIndices = this.cards
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => card.rank === 13)
            .map(({ index }) => index);

        // 조커 카드가 같은 플레이어에게 분배되도록 조정
        if (jokerIndices.length === 2) {
            const targetPlayer = Math.floor(Math.random() * numPlayers);
            hands[targetPlayer].push(this.cards[jokerIndices[0]]);
            hands[targetPlayer].push(this.cards[jokerIndices[1]]);
            
            // 조커 카드를 덱에서 제거
            this.cards = this.cards.filter((_, index) => !jokerIndices.includes(index));
        }

        // 나머지 카드 분배
        while (this.cards.length > 0) {
            const card = this.cards.pop()!;
            hands[currentPlayer].push(card);
            currentPlayer = (currentPlayer + 1) % numPlayers;
        }

        return hands;
    }
} 