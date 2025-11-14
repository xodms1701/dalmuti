/**
 * PlayCardDto.ts
 *
 * PlayCardUseCase의 Request/Response DTO 정의
 */

/**
 * 카드 플레이 요청
 */
export interface PlayCardRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 플레이할 카드들
   */
  cards: Array<{ rank: number; isJoker: boolean }>;
}

/**
 * 카드 플레이 응답
 */
export interface PlayCardResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 플레이한 카드들
   */
  playedCards: Array<{ rank: number; isJoker: boolean }>;

  /**
   * 다음 턴 플레이어 ID (null이면 게임 종료)
   */
  nextTurn: string | null;

  /**
   * 라운드 완료 여부 (모든 플레이어가 패스했는지)
   */
  roundFinished: boolean;
}
