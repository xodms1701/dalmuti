/**
 * TransitionTaxToPlayingDto.ts
 *
 * 세금 교환 페이즈에서 플레이 페이즈로 전환하는 DTO
 */

/**
 * 세금 교환 → 플레이 페이즈 전환 요청 DTO
 */
export interface TransitionTaxToPlayingRequest {
  /**
   * 방 ID
   */
  roomId: string;
}

/**
 * 세금 교환 → 플레이 페이즈 전환 응답 DTO
 */
export interface TransitionTaxToPlayingResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 현재 게임 페이즈 (전환 후)
   */
  phase: string;

  /**
   * 전환이 실제로 발생했는지 여부
   * (이미 playing 페이즈이거나 다른 페이즈인 경우 false)
   */
  transitioned: boolean;
}
