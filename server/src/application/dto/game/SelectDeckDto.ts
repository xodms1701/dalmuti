/**
 * SelectDeckDto.ts
 *
 * SelectDeckUseCase의 Request/Response DTO 정의
 */

/**
 * 덱 선택 요청
 */
export interface SelectDeckRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 선택할 덱의 인덱스
   */
  deckIndex: number;
}

/**
 * 덱 선택 응답
 */
export interface SelectDeckResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 선택된 카드들
   */
  selectedCards: Array<{ rank: number; isJoker: boolean }>;

  /**
   * 현재 게임 페이즈 (세금 교환 페이즈 전환 확인용)
   */
  phase: string;
}
