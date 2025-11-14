/**
 * Card Entity
 *
 * 달무티 게임의 카드를 나타내는 도메인 엔티티
 * - rank: 1-13 (낮을수록 강한 카드, 1이 최고)
 * - isJoker: 조커 여부
 */
export class Card {
  readonly rank: number;

  readonly isJoker: boolean;

  /**
   * Private constructor - factory method를 통해서만 생성 가능
   */
  private constructor(rank: number, isJoker: boolean) {
    this.rank = rank;
    this.isJoker = isJoker;
  }

  /**
   * Factory method - Card 인스턴스 생성
   * @param rank 카드 숫자 (1-13)
   * @param isJoker 조커 여부
   * @returns Card 인스턴스
   * @throws Error if rank is not between 1-13
   */
  static create(rank: number, isJoker: boolean = false): Card {
    if (rank < 1 || rank > 13) {
      throw new Error('Card rank must be between 1 and 13');
    }
    return new Card(rank, isJoker);
  }

  /**
   * 다른 카드보다 강한지 확인
   * 낮은 숫자가 더 강함 (1 > 2 > 3 ... > 13)
   * @param other 비교할 카드
   * @returns 이 카드가 더 강하면 true
   */
  isStrongerThan(other: Card): boolean {
    // 조커는 단독으로 낼 때 13으로 취급
    const thisRank = this.isJoker ? 13 : this.rank;
    const otherRank = other.isJoker ? 13 : other.rank;

    // 낮은 숫자가 더 강함
    return thisRank < otherRank;
  }

  /**
   * 카드 동등성 비교
   * @param other 비교할 카드
   * @returns 같은 카드면 true
   */
  equals(other: Card): boolean {
    return this.rank === other.rank && this.isJoker === other.isJoker;
  }

  /**
   * 카드를 플레인 객체로 변환
   */
  toPlainObject(): { rank: number; isJoker: boolean } {
    return {
      rank: this.rank,
      isJoker: this.isJoker,
    };
  }

  /**
   * 플레인 객체로부터 Card 인스턴스 생성
   */
  static fromPlainObject(obj: { rank: number; isJoker: boolean }): Card {
    return Card.create(obj.rank, obj.isJoker);
  }
}
