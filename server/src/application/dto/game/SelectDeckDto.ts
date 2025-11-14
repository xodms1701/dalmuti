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
}
