/**
 * VoteNextGameDto.ts
 *
 * VoteNextGameUseCase의 Request/Response DTO 정의
 */

/**
 * 다음 게임 투표 요청
 */
export interface VoteNextGameRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 투표 (true: 찬성, false: 반대)
   */
  vote: boolean;
}

/**
 * 다음 게임 투표 응답
 */
export interface VoteNextGameResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 투표가 통과되었는지 여부
   */
  votePassed: boolean;

  /**
   * 다음 게임이 시작되었는지 여부
   */
  nextGameStarted: boolean;

  /**
   * 현재 게임 페이즈
   */
  phase: string;
}
