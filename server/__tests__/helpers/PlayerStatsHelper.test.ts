/**
 * PlayerStatsHelper.test.ts
 *
 * PlayerStatsHelper 헬퍼 함수들의 단위 테스트
 */

import {
  ensurePlayerStats,
  incrementCardsPlayed,
  incrementPasses,
  setFinishedAtRound,
  initializeAllPlayerStats,
  getPlayerStats,
  updatePlayerStats,
  resetPlayerStats,
} from '../../game/helpers/PlayerStatsHelper';
import { Game, Player } from '../../types';
import { createCard, createMinimalGame } from './testHelpers';

describe('PlayerStatsHelper', () => {
  // 테스트용 플레이어 생성
  const createTestPlayer = (id: string, nickname: string): Player => ({
    id,
    nickname,
    cards: [createCard(1), createCard(2)],
    role: 1,
    rank: 1,
    isPassed: false,
    isReady: true,
  });

  describe('ensurePlayerStats', () => {
    it('플레이어 통계가 없으면 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      ensurePlayerStats(game, 'player1', player);

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].nickname).toBe('Player1');
      expect(game.playerStats['player1'].totalCardsPlayed).toBe(0);
      expect(game.playerStats['player1'].totalPasses).toBe(0);
      expect(game.playerStats['player1'].finishedAtRound).toBe(0);
    });

    it('플레이어 통계가 이미 있으면 유지해야 함', () => {
      const game = createMinimalGame({
        playerStats: {
          player1: {
            nickname: 'Player1',
            totalCardsPlayed: 10,
            totalPasses: 3,
            finishedAtRound: 5,
          },
        },
      });
      const player = createTestPlayer('player1', 'Player1');

      ensurePlayerStats(game, 'player1', player);

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(10);
      expect(game.playerStats['player1'].totalPasses).toBe(3);
      expect(game.playerStats['player1'].finishedAtRound).toBe(5);
    });
  });

  describe('incrementCardsPlayed', () => {
    it('카드 플레이 횟수를 증가시켜야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementCardsPlayed(game, 'player1', player, 3);

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(3);
    });

    it('여러 번 호출 시 누적되어야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementCardsPlayed(game, 'player1', player, 2);
      incrementCardsPlayed(game, 'player1', player, 3);

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(5);
    });

    it('통계가 없으면 먼저 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementCardsPlayed(game, 'player1', player, 2);

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].totalCardsPlayed).toBe(2);
    });
  });

  describe('incrementPasses', () => {
    it('패스 횟수를 증가시켜야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementPasses(game, 'player1', player);

      expect(game.playerStats['player1'].totalPasses).toBe(1);
    });

    it('여러 번 호출 시 누적되어야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementPasses(game, 'player1', player);
      incrementPasses(game, 'player1', player);
      incrementPasses(game, 'player1', player);

      expect(game.playerStats['player1'].totalPasses).toBe(3);
    });

    it('통계가 없으면 먼저 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      incrementPasses(game, 'player1', player);

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].totalPasses).toBe(1);
    });
  });

  describe('setFinishedAtRound', () => {
    it('완료 라운드를 기록해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      setFinishedAtRound(game, 'player1', player, 5);

      expect(game.playerStats['player1'].finishedAtRound).toBe(5);
    });

    it('통계가 없으면 먼저 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      setFinishedAtRound(game, 'player1', player, 3);

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].finishedAtRound).toBe(3);
    });
  });

  describe('initializeAllPlayerStats', () => {
    it('모든 플레이어의 통계를 초기화해야 함', () => {
      const players = [
        createTestPlayer('player1', 'Player1'),
        createTestPlayer('player2', 'Player2'),
        createTestPlayer('player3', 'Player3'),
      ];

      const stats = initializeAllPlayerStats(players);

      expect(Object.keys(stats).length).toBe(3);
      expect(stats['player1'].nickname).toBe('Player1');
      expect(stats['player2'].nickname).toBe('Player2');
      expect(stats['player3'].nickname).toBe('Player3');

      // 모든 통계가 0으로 초기화되어야 함
      Object.values(stats).forEach((stat) => {
        expect(stat.totalCardsPlayed).toBe(0);
        expect(stat.totalPasses).toBe(0);
        expect(stat.finishedAtRound).toBe(0);
      });
    });

    it('플레이어가 없으면 빈 객체를 반환해야 함', () => {
      const stats = initializeAllPlayerStats([]);

      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe('getPlayerStats', () => {
    it('플레이어 통계를 반환해야 함', () => {
      const game = createMinimalGame({
        playerStats: {
          player1: {
            nickname: 'Player1',
            totalCardsPlayed: 10,
            totalPasses: 3,
            finishedAtRound: 5,
          },
        },
      });
      const player = createTestPlayer('player1', 'Player1');

      const stats = getPlayerStats(game, 'player1', player);

      expect(stats.totalCardsPlayed).toBe(10);
      expect(stats.totalPasses).toBe(3);
      expect(stats.finishedAtRound).toBe(5);
    });

    it('통계가 없으면 초기화 후 반환해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      const stats = getPlayerStats(game, 'player1', player);

      expect(stats).toBeDefined();
      expect(stats.totalCardsPlayed).toBe(0);
      expect(stats.totalPasses).toBe(0);
    });
  });

  describe('updatePlayerStats', () => {
    it('플레이어 통계를 부분 업데이트해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      updatePlayerStats(game, 'player1', player, {
        totalCardsPlayed: 10,
        totalPasses: 5,
      });

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(10);
      expect(game.playerStats['player1'].totalPasses).toBe(5);
      expect(game.playerStats['player1'].finishedAtRound).toBe(0); // 변경되지 않음
    });

    it('일부 필드만 업데이트할 수 있어야 함', () => {
      const game = createMinimalGame({
        playerStats: {
          player1: {
            nickname: 'Player1',
            totalCardsPlayed: 5,
            totalPasses: 2,
            finishedAtRound: 0,
          },
        },
      });
      const player = createTestPlayer('player1', 'Player1');

      updatePlayerStats(game, 'player1', player, {
        totalCardsPlayed: 10,
      });

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(10);
      expect(game.playerStats['player1'].totalPasses).toBe(2); // 유지
      expect(game.playerStats['player1'].finishedAtRound).toBe(0); // 유지
    });

    it('통계가 없으면 먼저 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      updatePlayerStats(game, 'player1', player, {
        totalCardsPlayed: 5,
      });

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].totalCardsPlayed).toBe(5);
    });
  });

  describe('resetPlayerStats', () => {
    it('플레이어 통계를 초기화해야 함', () => {
      const game = createMinimalGame({
        playerStats: {
          player1: {
            nickname: 'Player1',
            totalCardsPlayed: 10,
            totalPasses: 3,
            finishedAtRound: 5,
          },
        },
      });
      const player = createTestPlayer('player1', 'Player1');

      resetPlayerStats(game, 'player1', player);

      expect(game.playerStats['player1'].totalCardsPlayed).toBe(0);
      expect(game.playerStats['player1'].totalPasses).toBe(0);
      expect(game.playerStats['player1'].finishedAtRound).toBe(0);
      expect(game.playerStats['player1'].nickname).toBe('Player1'); // 유지
    });

    it('통계가 없어도 에러 없이 초기화해야 함', () => {
      const game = createMinimalGame();
      const player = createTestPlayer('player1', 'Player1');

      expect(() => resetPlayerStats(game, 'player1', player)).not.toThrow();

      expect(game.playerStats['player1']).toBeDefined();
      expect(game.playerStats['player1'].totalCardsPlayed).toBe(0);
    });
  });
});
