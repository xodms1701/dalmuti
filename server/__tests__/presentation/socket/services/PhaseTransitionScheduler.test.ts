/**
 * PhaseTransitionScheduler.test.ts
 *
 * PhaseTransitionScheduler의 단위 테스트
 */

import {
  PhaseTransitionScheduler,
  PHASE_TRANSITION_DELAYS,
} from '../../../../src/presentation/socket/services/PhaseTransitionScheduler';

describe('PhaseTransitionScheduler', () => {
  let scheduler: PhaseTransitionScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = new PhaseTransitionScheduler();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('schedule', () => {
    it('should schedule a transition function with the specified delay', async () => {
      const roomId = 'ROOM01';
      const delay = 3000;
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      scheduler.schedule(roomId, delay, transitionFn);

      // 아직 실행되지 않았어야 함
      expect(transitionFn).not.toHaveBeenCalled();

      // 3초 경과
      jest.advanceTimersByTime(delay);

      // Promise가 resolve될 때까지 대기
      await Promise.resolve();

      // 이제 실행되었어야 함
      expect(transitionFn).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in transition function', async () => {
      const roomId = 'ROOM02';
      const delay = 1000;
      const error = new Error('Transition failed');
      const transitionFn = jest.fn().mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      scheduler.schedule(roomId, delay, transitionFn);

      jest.advanceTimersByTime(delay);
      await Promise.resolve();

      expect(transitionFn).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to execute phase transition for room ${roomId}:`,
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return a timer ID', () => {
      const roomId = 'ROOM03';
      const delay = 1000;
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      const timerId = scheduler.schedule(roomId, delay, transitionFn);

      expect(timerId).toBeDefined();
      expect(typeof timerId).toBe('object'); // NodeJS.Timeout
    });
  });

  describe('scheduleRoleSelectionCompleteToCardSelection', () => {
    it('should schedule transition with 5 second delay', async () => {
      const roomId = 'ROOM04';
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      scheduler.scheduleRoleSelectionCompleteToCardSelection(roomId, transitionFn);

      // 5초 전에는 실행되지 않아야 함
      jest.advanceTimersByTime(4999);
      await Promise.resolve();
      expect(transitionFn).not.toHaveBeenCalled();

      // 5초 후에는 실행되어야 함
      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(transitionFn).toHaveBeenCalledTimes(1);
    });

    it('should use PHASE_TRANSITION_DELAYS.ROLE_SELECTION_COMPLETE_TO_CARD_SELECTION constant', async () => {
      const roomId = 'ROOM05';
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      scheduler.scheduleRoleSelectionCompleteToCardSelection(roomId, transitionFn);

      jest.advanceTimersByTime(PHASE_TRANSITION_DELAYS.ROLE_SELECTION_COMPLETE_TO_CARD_SELECTION);
      await Promise.resolve();

      expect(transitionFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleTaxToPlaying', () => {
    it('should schedule transition with 10 second delay', async () => {
      const roomId = 'ROOM06';
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      scheduler.scheduleTaxToPlaying(roomId, transitionFn);

      // 10초 전에는 실행되지 않아야 함
      jest.advanceTimersByTime(9999);
      await Promise.resolve();
      expect(transitionFn).not.toHaveBeenCalled();

      // 10초 후에는 실행되어야 함
      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(transitionFn).toHaveBeenCalledTimes(1);
    });

    it('should use PHASE_TRANSITION_DELAYS.TAX_TO_PLAYING constant', async () => {
      const roomId = 'ROOM07';
      const transitionFn = jest.fn().mockResolvedValue(undefined);

      scheduler.scheduleTaxToPlaying(roomId, transitionFn);

      jest.advanceTimersByTime(PHASE_TRANSITION_DELAYS.TAX_TO_PLAYING);
      await Promise.resolve();

      expect(transitionFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('PHASE_TRANSITION_DELAYS constants', () => {
    it('should have correct delay values', () => {
      expect(PHASE_TRANSITION_DELAYS.ROLE_SELECTION_COMPLETE_TO_CARD_SELECTION).toBe(5000);
      expect(PHASE_TRANSITION_DELAYS.TAX_TO_PLAYING).toBe(10000);
    });
  });

  describe('multiple transitions', () => {
    it('should handle multiple scheduled transitions independently', async () => {
      const roomId1 = 'ROOM08';
      const roomId2 = 'ROOM09';
      const transitionFn1 = jest.fn().mockResolvedValue(undefined);
      const transitionFn2 = jest.fn().mockResolvedValue(undefined);

      scheduler.scheduleRoleSelectionCompleteToCardSelection(roomId1, transitionFn1);
      scheduler.scheduleTaxToPlaying(roomId2, transitionFn2);

      // 5초 후 첫 번째만 실행
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(transitionFn1).toHaveBeenCalledTimes(1);
      expect(transitionFn2).not.toHaveBeenCalled();

      // 추가 5초 후 두 번째도 실행
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(transitionFn1).toHaveBeenCalledTimes(1);
      expect(transitionFn2).toHaveBeenCalledTimes(1);
    });
  });
});
