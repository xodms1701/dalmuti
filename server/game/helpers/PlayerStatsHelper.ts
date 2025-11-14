/**
 * PlayerStatsHelper.ts
 *
 * 플레이어 통계 관리 헬퍼 함수들
 * playCard와 passTurn에서 중복되는 통계 초기화 및 업데이트 로직을 통합합니다.
 */

/* eslint-disable no-param-reassign, no-plusplus */
import { Game, Player } from '../../types';

/**
 * 플레이어 통계 타입 정의
 */
export interface PlayerStats {
  nickname: string;
  totalCardsPlayed: number;
  totalPasses: number;
  finishedAtRound: number;
}

/**
 * 플레이어 통계가 존재하는지 확인하고 없으면 초기화합니다.
 * 테스트에서 강제로 상태를 설정하는 경우를 대비한 방어 코드입니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 *
 * @example
 * ensurePlayerStats(game, playerId, player);
 * game.playerStats[playerId].totalCardsPlayed++; // 안전하게 접근 가능
 */
export function ensurePlayerStats(game: Game, playerId: string, player: Player): void {
  if (!game.playerStats[playerId]) {
    game.playerStats[playerId] = {
      nickname: player.nickname,
      totalCardsPlayed: 0,
      totalPasses: 0,
      finishedAtRound: 0,
    };
  }
}

/**
 * 플레이어의 카드 플레이 횟수를 증가시킵니다.
 * 통계가 없으면 먼저 초기화합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 * @param cardCount - 플레이한 카드 수
 *
 * @example
 * incrementCardsPlayed(game, playerId, player, playedCards.length);
 */
export function incrementCardsPlayed(
  game: Game,
  playerId: string,
  player: Player,
  cardCount: number
): void {
  ensurePlayerStats(game, playerId, player);
  game.playerStats[playerId].totalCardsPlayed += cardCount;
}

/**
 * 플레이어의 패스 횟수를 증가시킵니다.
 * 통계가 없으면 먼저 초기화합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 *
 * @example
 * incrementPasses(game, playerId, player);
 */
export function incrementPasses(game: Game, playerId: string, player: Player): void {
  ensurePlayerStats(game, playerId, player);
  game.playerStats[playerId].totalPasses++;
}

/**
 * 플레이어가 게임을 완료한 라운드를 기록합니다.
 * 통계가 없으면 먼저 초기화합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 * @param round - 완료한 라운드 번호
 *
 * @example
 * setFinishedAtRound(game, playerId, player, game.round);
 */
export function setFinishedAtRound(
  game: Game,
  playerId: string,
  player: Player,
  round: number
): void {
  ensurePlayerStats(game, playerId, player);
  game.playerStats[playerId].finishedAtRound = round;
}

/**
 * 모든 플레이어의 통계를 초기화합니다.
 * 게임 시작 시 사용합니다.
 *
 * @param players - 플레이어 배열
 * @returns 초기화된 플레이어 통계 객체
 *
 * @example
 * game.playerStats = initializeAllPlayerStats(game.players);
 */
export function initializeAllPlayerStats(players: Player[]): Record<string, PlayerStats> {
  const stats: Record<string, PlayerStats> = {};

  players.forEach((player) => {
    stats[player.id] = {
      nickname: player.nickname,
      totalCardsPlayed: 0,
      totalPasses: 0,
      finishedAtRound: 0,
    };
  });

  return stats;
}

/**
 * 플레이어의 통계를 가져옵니다.
 * 통계가 없으면 초기화 후 반환합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 * @returns 플레이어 통계
 *
 * @example
 * const stats = getPlayerStats(game, playerId, player);
 * console.log(`Total cards played: ${stats.totalCardsPlayed}`);
 */
export function getPlayerStats(game: Game, playerId: string, player: Player): PlayerStats {
  ensurePlayerStats(game, playerId, player);
  return game.playerStats[playerId];
}

/**
 * 플레이어의 통계를 업데이트합니다.
 * 통계가 없으면 먼저 초기화합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 * @param updates - 업데이트할 통계 부분
 *
 * @example
 * updatePlayerStats(game, playerId, player, {
 *   totalCardsPlayed: 10,
 *   totalPasses: 3
 * });
 */
export function updatePlayerStats(
  game: Game,
  playerId: string,
  player: Player,
  updates: Partial<PlayerStats>
): void {
  ensurePlayerStats(game, playerId, player);
  game.playerStats[playerId] = {
    ...game.playerStats[playerId],
    ...updates,
  };
}

/**
 * 플레이어의 통계를 초기화합니다.
 *
 * @param game - 게임 상태
 * @param playerId - 플레이어 ID
 * @param player - 플레이어 객체
 *
 * @example
 * resetPlayerStats(game, playerId, player);
 */
export function resetPlayerStats(game: Game, playerId: string, player: Player): void {
  game.playerStats[playerId] = {
    nickname: player.nickname,
    totalCardsPlayed: 0,
    totalPasses: 0,
    finishedAtRound: 0,
  };
}
