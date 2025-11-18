/**
 * StartGameDto.ts
 *
 * 게임 시작 요청/응답 DTO
 */

/**
 * 게임 시작 요청 DTO
 */
export interface StartGameRequest {
  roomId: string;
  playerId: string; // 게임 시작을 요청한 플레이어 ID (방장만 가능)
}

/**
 * 게임 시작 응답 DTO
 */
export interface StartGameResponse {
  roomId: string;
  phase: string;
  playerCount: number;
}
