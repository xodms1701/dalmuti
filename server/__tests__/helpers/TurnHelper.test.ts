/**
 * TurnHelper.test.ts
 *
 * TurnHelper 헬퍼 함수들의 단위 테스트
 */

import {
  getSortedPlayers,
  isPlayerActive,
  findNextPlayer,
  findNextPlayerFrom,
  findFirstActivePlayer,
  allPlayersPassedExceptLast,
  startNewRound,
  countActivePlayers,
  getLastActivePlayer,
} from '../../game/helpers/TurnHelper';
import { Game, Player } from '../../types';
import { createCard, createMinimalGame } from './testHelpers';

describe('TurnHelper', () => {
  // 테스트용 플레이어 생성
  const createTestPlayer = (
    id: string,
    nickname: string,
    rank: number,
    cardCount: number = 3,
    isPassed: boolean = false
  ): Player => ({
    id,
    nickname,
    cards: Array(cardCount)
      .fill(null)
      .map((_, i) => createCard(i + 1)),
    role: rank,
    rank,
    isPassed,
    isReady: true,
  });

  describe('getSortedPlayers', () => {
    it('플레이어를 순위 순서대로 정렬해야 함', () => {
      const players = [
        createTestPlayer('player3', 'Player3', 3),
        createTestPlayer('player1', 'Player1', 1),
        createTestPlayer('player2', 'Player2', 2),
      ];

      const sorted = getSortedPlayers(players);

      expect(sorted[0].id).toBe('player1');
      expect(sorted[1].id).toBe('player2');
      expect(sorted[2].id).toBe('player3');
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const players = [
        createTestPlayer('player3', 'Player3', 3),
        createTestPlayer('player1', 'Player1', 1),
      ];

      const sorted = getSortedPlayers(players);

      expect(players[0].id).toBe('player3');
      expect(sorted).not.toBe(players);
    });
  });

  describe('isPlayerActive', () => {
    it('카드가 있고 완료하지 않은 플레이어는 활성 상태여야 함', () => {
      const player = createTestPlayer('player1', 'Player1', 1, 3);
      expect(isPlayerActive(player, [])).toBe(true);
    });

    it('카드가 없으면 비활성 상태여야 함', () => {
      const player = createTestPlayer('player1', 'Player1', 1, 0);
      expect(isPlayerActive(player, [])).toBe(false);
    });

    it('게임을 완료했으면 비활성 상태여야 함', () => {
      const player = createTestPlayer('player1', 'Player1', 1, 3);
      expect(isPlayerActive(player, ['player1'])).toBe(false);
    });
  });

  describe('findNextPlayer', () => {
    it('다음 활성 플레이어를 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
        currentTurn: 'player1',
      });

      const nextPlayerId = findNextPlayer(game, 'player1');
      expect(nextPlayerId).toBe('player2');
    });

    it('카드가 없는 플레이어를 건너뛰어야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 0), // 카드 없음
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
        currentTurn: 'player1',
      });

      const nextPlayerId = findNextPlayer(game, 'player1');
      expect(nextPlayerId).toBe('player3');
    });

    it('완료한 플레이어를 건너뛰어야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
        currentTurn: 'player1',
        finishedPlayers: ['player2'],
      });

      const nextPlayerId = findNextPlayer(game, 'player1');
      expect(nextPlayerId).toBe('player3');
    });

    it('순환하여 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
        currentTurn: 'player3',
      });

      const nextPlayerId = findNextPlayer(game, 'player3');
      expect(nextPlayerId).toBe('player1');
    });

    it('활성 플레이어가 없으면 현재 플레이어를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0),
          createTestPlayer('player2', 'Player2', 2, 0),
        ],
        currentTurn: 'player1',
      });

      const nextPlayerId = findNextPlayer(game, 'player1');
      expect(nextPlayerId).toBe('player1');
    });
  });

  describe('findNextPlayerFrom', () => {
    it('특정 플레이어로부터 다음 활성 플레이어를 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
      });

      const nextPlayerId = findNextPlayerFrom(game, 'player2');
      expect(nextPlayerId).toBe('player2'); // player2 자신이 활성 상태
    });

    it('시작 플레이어가 비활성이면 다음 플레이어를 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 0), // 비활성
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
      });

      const nextPlayerId = findNextPlayerFrom(game, 'player2');
      expect(nextPlayerId).toBe('player3');
    });
  });

  describe('findFirstActivePlayer', () => {
    it('첫 번째 활성 플레이어를 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
        ],
      });

      const firstPlayerId = findFirstActivePlayer(game);
      expect(firstPlayerId).toBe('player1');
    });

    it('첫 번째 플레이어가 비활성이면 다음 플레이어를 찾아야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0), // 비활성
          createTestPlayer('player2', 'Player2', 2, 3),
        ],
      });

      const firstPlayerId = findFirstActivePlayer(game);
      expect(firstPlayerId).toBe('player2');
    });

    it('활성 플레이어가 없으면 null을 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0),
          createTestPlayer('player2', 'Player2', 2, 0),
        ],
      });

      const firstPlayerId = findFirstActivePlayer(game);
      expect(firstPlayerId).toBeNull();
    });
  });

  describe('allPlayersPassedExceptLast', () => {
    it('마지막 플레이어 외 모두 패스했으면 true를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true), // 패스
          createTestPlayer('player2', 'Player2', 2, 3, false), // 마지막 플레이어
          createTestPlayer('player3', 'Player3', 3, 3, true), // 패스
        ],
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      expect(allPlayersPassedExceptLast(game)).toBe(true);
    });

    it('패스하지 않은 플레이어가 있으면 false를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, false), // 패스 안함
          createTestPlayer('player2', 'Player2', 2, 3, false), // 마지막 플레이어
          createTestPlayer('player3', 'Player3', 3, 3, true), // 패스
        ],
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      expect(allPlayersPassedExceptLast(game)).toBe(false);
    });

    it('완료한 플레이어는 무시해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0, false), // 완료
          createTestPlayer('player2', 'Player2', 2, 3, false), // 마지막 플레이어
          createTestPlayer('player3', 'Player3', 3, 3, true), // 패스
        ],
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
        finishedPlayers: ['player1'],
      });

      expect(allPlayersPassedExceptLast(game)).toBe(true);
    });

    it('lastPlay가 없으면 false를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true),
          createTestPlayer('player2', 'Player2', 2, 3, true),
        ],
      });

      expect(allPlayersPassedExceptLast(game)).toBe(false);
    });
  });

  describe('startNewRound', () => {
    it('라운드를 증가시켜야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true),
          createTestPlayer('player2', 'Player2', 2, 3, false),
        ],
        round: 1,
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      const updates = startNewRound(game);

      expect(updates.round).toBe(2);
    });

    it('lastPlay를 undefined로 설정해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true),
          createTestPlayer('player2', 'Player2', 2, 3, false),
        ],
        round: 1,
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      const updates = startNewRound(game);

      expect(updates.lastPlay).toBeUndefined();
    });

    it('모든 활성 플레이어의 패스 상태를 초기화해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true),
          createTestPlayer('player2', 'Player2', 2, 3, true),
        ],
        round: 1,
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      startNewRound(game);

      expect(game.players[0].isPassed).toBe(false);
      expect(game.players[1].isPassed).toBe(false);
    });

    it('완료한 플레이어의 패스 상태는 유지해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0, true), // 완료
          createTestPlayer('player2', 'Player2', 2, 3, true),
        ],
        round: 1,
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
        finishedPlayers: ['player1'],
      });

      startNewRound(game);

      expect(game.players[0].isPassed).toBe(true); // 유지
      expect(game.players[1].isPassed).toBe(false); // 초기화
    });

    it('다음 턴을 설정해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3, true),
          createTestPlayer('player2', 'Player2', 2, 3, false),
        ],
        round: 1,
        lastPlay: {
          playerId: 'player2',
          cards: [createCard(5)],
        },
      });

      const updates = startNewRound(game);

      expect(updates.currentTurn).toBe('player2');
    });

    it('lastPlay가 없으면 에러를 던져야 함', () => {
      const game = createMinimalGame({
        players: [createTestPlayer('player1', 'Player1', 1, 3)],
        round: 1,
      });

      expect(() => startNewRound(game)).toThrow('Cannot start new round without previous last play');
    });
  });

  describe('countActivePlayers', () => {
    it('활성 플레이어 수를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 0), // 비활성
        ],
      });

      expect(countActivePlayers(game)).toBe(2);
    });

    it('완료한 플레이어는 제외해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
          createTestPlayer('player3', 'Player3', 3, 3),
        ],
        finishedPlayers: ['player1'],
      });

      expect(countActivePlayers(game)).toBe(2);
    });
  });

  describe('getLastActivePlayer', () => {
    it('마지막 남은 활성 플레이어를 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0), // 비활성
          createTestPlayer('player2', 'Player2', 2, 3), // 유일한 활성 플레이어
        ],
      });

      const lastPlayer = getLastActivePlayer(game);
      expect(lastPlayer?.id).toBe('player2');
    });

    it('활성 플레이어가 여러 명이면 null을 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 3),
          createTestPlayer('player2', 'Player2', 2, 3),
        ],
      });

      const lastPlayer = getLastActivePlayer(game);
      expect(lastPlayer).toBeNull();
    });

    it('활성 플레이어가 없으면 null을 반환해야 함', () => {
      const game = createMinimalGame({
        players: [
          createTestPlayer('player1', 'Player1', 1, 0),
          createTestPlayer('player2', 'Player2', 2, 0),
        ],
      });

      const lastPlayer = getLastActivePlayer(game);
      expect(lastPlayer).toBeNull();
    });
  });
});
