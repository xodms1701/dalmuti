/**
 * LeaveGameDto.ts
 *
 * LeaveGameUseCase의 Request/Response DTO 정의
 */

/**
 * 게임 나가기 요청
 */
export interface LeaveGameRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;
}

/**
 * 게임 나가기 응답
 */
export interface LeaveGameResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 남은 플레이어 수
   */
  remainingPlayers: number;

  /**
   * 게임 삭제 여부 (마지막 플레이어가 나간 경우)
   */
  gameDeleted: boolean;
}
