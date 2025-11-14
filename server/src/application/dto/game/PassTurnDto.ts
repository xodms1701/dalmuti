/**
 * PassTurnDto.ts
 *
 * 턴 패스 관련 DTO
 */

/**
 * 턴 패스 요청 DTO
 */
export interface PassTurnRequest {
  roomId: string;
  playerId: string;
}

/**
 * 턴 패스 응답 DTO
 */
export interface PassTurnResponse {
  roomId: string;
  playerId: string;
  nextTurn: string | null;
  allPlayersPassed: boolean;
}
