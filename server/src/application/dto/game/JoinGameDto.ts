/**
 * JoinGameDto.ts
 *
 * 게임 참가 관련 DTO
 */

/**
 * 게임 참가 요청 DTO
 */
export interface JoinGameRequest {
  roomId: string;
  playerId: string;
  nickname: string;
}

/**
 * 게임 참가 응답 DTO
 */
export interface JoinGameResponse {
  roomId: string;
  playerId: string;
  playerCount: number;
}
