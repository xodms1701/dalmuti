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
}

/**
 * 게임 시작 응답 DTO
 */
export interface StartGameResponse {
  roomId: string;
  phase: string;
  playerCount: number;
}
