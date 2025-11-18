/**
 * PhaseTransitionScheduler.ts
 *
 * 페이즈 전환을 위한 중앙 집중식 스케줄러
 *
 * 책임:
 * - setTimeout을 사용한 지연 실행 관리
 * - 에러 핸들링 통일
 * - 타임아웃 값 중앙 관리
 */

/**
 * 페이즈 전환 타임아웃 상수 (밀리초)
 */
export const PHASE_TRANSITION_DELAYS = {
  ROLE_SELECTION_COMPLETE_TO_CARD_SELECTION: 5000, // 5초
  TAX_TO_PLAYING: 10000, // 10초
} as const;

/**
 * PhaseTransitionScheduler
 *
 * 페이즈 전환을 지연 실행하는 스케줄러
 * 나중에 BullMQ, Agenda.js 등으로 교체 가능하도록 설계
 */
export class PhaseTransitionScheduler {
  /**
   * 페이즈 전환을 스케줄링합니다.
   *
   * @param roomId - 방 ID
   * @param delay - 지연 시간 (밀리초)
   * @param transitionFn - 실행할 전환 함수
   * @returns 타이머 ID
   */
  schedule(roomId: string, delay: number, transitionFn: () => Promise<void>): NodeJS.Timeout {
    return setTimeout(async () => {
      try {
        await transitionFn();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to execute phase transition for room ${roomId}:`, error);
      }
    }, delay);
  }

  /**
   * 역할 선택 완료 → 카드 선택 페이즈 전환 스케줄링
   *
   * @param roomId - 방 ID
   * @param transitionFn - 실행할 전환 함수
   * @returns 타이머 ID
   */
  scheduleRoleSelectionCompleteToCardSelection(
    roomId: string,
    transitionFn: () => Promise<void>
  ): NodeJS.Timeout {
    return this.schedule(
      roomId,
      PHASE_TRANSITION_DELAYS.ROLE_SELECTION_COMPLETE_TO_CARD_SELECTION,
      transitionFn
    );
  }

  /**
   * 세금 → 플레이 페이즈 전환 스케줄링
   *
   * @param roomId - 방 ID
   * @param transitionFn - 실행할 전환 함수
   * @returns 타이머 ID
   */
  scheduleTaxToPlaying(roomId: string, transitionFn: () => Promise<void>): NodeJS.Timeout {
    return this.schedule(roomId, PHASE_TRANSITION_DELAYS.TAX_TO_PLAYING, transitionFn);
  }
}
