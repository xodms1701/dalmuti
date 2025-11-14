/**
 * SelectRevolutionDto.ts
 *
 * 혁명 선택 요청/응답 DTO
 */

/**
 * 혁명 선택 요청 DTO
 */
export interface SelectRevolutionRequest {
  roomId: string;
  playerId: string;
  wantRevolution: boolean;
}

/**
 * 혁명 선택 응답 DTO
 */
export interface SelectRevolutionResponse {
  roomId: string;
  playerId: string;
  wantRevolution: boolean;
  phase: string;
  revolutionStatus?: {
    isRevolution: boolean;
    isGreatRevolution: boolean;
    revolutionPlayerId: string;
  };
}
