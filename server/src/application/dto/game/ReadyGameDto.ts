/**
 * ReadyGameDto.ts
 *
 * ReadyGameUseCase의 Request/Response DTO 정의
 */

/**
 * 게임 준비 상태 변경 요청
 */
export interface ReadyGameRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 준비 상태
   * true: 준비 완료, false: 준비 취소
   */
  isReady: boolean;
}

/**
 * 게임 준비 상태 변경 응답
 */
export interface ReadyGameResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 준비 상태
   */
  isReady: boolean;

  /**
   * 현재 플레이어 수
   */
  playerCount: number;

  /**
   * 모든 플레이어가 준비 완료했는지 여부
   */
  allPlayersReady: boolean;
}
