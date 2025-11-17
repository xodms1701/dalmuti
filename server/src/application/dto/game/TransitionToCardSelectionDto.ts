/**
 * TransitionToCardSelectionDto.ts
 *
 * 역할 선택 완료 후 카드 선택 페이즈로 전환하는 DTO
 */

export interface TransitionToCardSelectionRequest {
  roomId: string;
}

export interface TransitionToCardSelectionResponse {
  roomId: string;
  phase: string;
  transitioned: boolean;
  currentTurn: string | null;
}
