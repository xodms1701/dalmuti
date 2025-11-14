/* eslint-disable no-plusplus */
import { Card } from './Card';
import { PlayerId } from '../value-objects/PlayerId';

/**
 * Player Entity
 *
 * 달무티 게임의 플레이어를 나타내는 도메인 엔티티
 */
export class Player {
  readonly id: PlayerId;

  readonly nickname: string;

  private _cards: Card[];

  private _role: number | null;

  private _rank: number | null;

  private _isPassed: boolean;

  private _isReady: boolean;

  private _hasDoubleJoker?: boolean; // 조커 2장 보유 여부

  private _revolutionChoice?: boolean; // 혁명 선택 여부 (true: 혁명, false: 거부)

  /**
   * Private constructor - factory method를 통해서만 생성 가능
   */
  private constructor(
    id: PlayerId,
    nickname: string,
    cards: Card[] = [],
    role: number | null = null,
    rank: number | null = null,
    isPassed: boolean = false,
    isReady: boolean = false,
    hasDoubleJoker?: boolean,
    revolutionChoice?: boolean
  ) {
    this.id = id;
    this.nickname = nickname;
    this._cards = cards;
    this._role = role;
    this._rank = rank;
    this._isPassed = isPassed;
    this._isReady = isReady;
    this._hasDoubleJoker = hasDoubleJoker;
    this._revolutionChoice = revolutionChoice;
  }

  /**
   * Factory method - Player 인스턴스 생성
   * @param id 플레이어 ID (PlayerId Value Object)
   * @param nickname 플레이어 닉네임
   * @returns Player 인스턴스
   */
  static create(id: PlayerId, nickname: string): Player {
    if (!nickname || nickname.trim() === '') {
      throw new Error('Player nickname cannot be empty');
    }
    return new Player(id, nickname);
  }

  // Getters
  get cards(): Card[] {
    return [...this._cards]; // 불변성 보장을 위해 복사본 반환
  }

  get role(): number | null {
    return this._role;
  }

  get rank(): number | null {
    return this._rank;
  }

  get isPassed(): boolean {
    return this._isPassed;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get hasDoubleJoker(): boolean | undefined {
    return this._hasDoubleJoker;
  }

  get revolutionChoice(): boolean | undefined {
    return this._revolutionChoice;
  }

  /**
   * 조커 2장 보유 플래그 설정
   */
  markHasDoubleJoker(): void {
    this._hasDoubleJoker = true;
  }

  /**
   * 조커 2장 보유 플래그 제거
   */
  clearDoubleJokerFlag(): void {
    this._hasDoubleJoker = undefined;
  }

  /**
   * 혁명 선택
   * @param wantRevolution true: 혁명 일으킴, false: 혁명 거부
   */
  selectRevolution(wantRevolution: boolean): void {
    this._revolutionChoice = wantRevolution;
  }

  /**
   * 카드를 플레이
   * @param cards 플레이할 카드들
   */
  playCards(cards: Card[]): void {
    if (!cards || cards.length === 0) {
      throw new Error('Cannot play empty cards');
    }

    // 카드 보유 여부 확인 및 제거 (중복 카드 정확히 처리)
    const remainingCards = [...this._cards];
    for (const cardToPlay of cards) {
      const cardIndex = remainingCards.findIndex(
        (c) => c.rank === cardToPlay.rank && c.isJoker === cardToPlay.isJoker
      );
      if (cardIndex === -1) {
        throw new Error(`Player does not have card: ${cardToPlay.rank}`);
      }
      // 임시 배열에서 카드를 제거하여 중복 카드를 정확히 처리
      remainingCards.splice(cardIndex, 1);
    }

    // 모든 카드가 유효하면 실제 카드 목록을 업데이트
    this._cards = remainingCards;

    // 패스 상태 초기화
    this._isPassed = false;
  }

  /**
   * 턴을 패스
   */
  pass(): void {
    this._isPassed = true;
  }

  /**
   * 패스 상태 초기화
   */
  resetPass(): void {
    this._isPassed = false;
  }

  /**
   * 준비 완료
   */
  ready(): void {
    this._isReady = true;
  }

  /**
   * 준비 취소
   */
  unready(): void {
    this._isReady = false;
  }

  /**
   * 역할 할당
   * @param role 역할 번호
   */
  assignRole(role: number): void {
    if (role < 1 || role > 13) {
      throw new Error('Role must be between 1 and 13');
    }
    this._role = role;
  }

  /**
   * 순위 할당
   * @param rank 순위
   */
  assignRank(rank: number): void {
    if (rank < 1) {
      throw new Error('Rank must be greater than 0');
    }
    this._rank = rank;
  }

  /**
   * 카드 할당
   * @param cards 할당할 카드들
   */
  assignCards(cards: Card[]): void {
    this._cards = [...cards];
  }

  /**
   * 카드 추가
   * @param cards 추가할 카드들
   */
  addCards(cards: Card[]): void {
    this._cards.push(...cards);
  }

  /**
   * 플레이어가 게임을 완료했는지 확인 (카드를 모두 냈는지)
   */
  hasFinished(): boolean {
    return this._cards.length === 0;
  }

  /**
   * 플레이어 상태를 플레인 객체로 변환
   */
  toPlainObject(): {
    id: string;
    nickname: string;
    cards: ReturnType<Card['toPlainObject']>[];
    role: number | null;
    rank: number | null;
    isPassed: boolean;
    isReady: boolean;
    hasDoubleJoker?: boolean;
    revolutionChoice?: boolean;
  } {
    return {
      id: this.id.value, // PlayerId를 string으로 변환
      nickname: this.nickname,
      cards: this._cards.map((c) => c.toPlainObject()), // Card[]를 plain object로 변환
      role: this._role,
      rank: this._rank,
      isPassed: this._isPassed,
      isReady: this._isReady,
      hasDoubleJoker: this._hasDoubleJoker,
      revolutionChoice: this._revolutionChoice,
    };
  }

  /**
   * 플레인 객체로부터 Player 인스턴스 생성
   */
  static fromPlainObject(obj: {
    id: string;
    nickname: string;
    cards?: ReturnType<Card['toPlainObject']>[];
    role?: number | null;
    rank?: number | null;
    isPassed?: boolean;
    isReady?: boolean;
    hasDoubleJoker?: boolean;
    revolutionChoice?: boolean;
  }): Player {
    const playerId = PlayerId.create(obj.id); // string을 PlayerId로 변환
    const cards = obj.cards
      ? obj.cards.map((c) => Card.fromPlainObject(c)) // plain object를 Card[]로 변환
      : [];
    return new Player(
      playerId,
      obj.nickname,
      cards,
      obj.role || null,
      obj.rank || null,
      obj.isPassed || false,
      obj.isReady || false,
      obj.hasDoubleJoker,
      obj.revolutionChoice
    );
  }
}
