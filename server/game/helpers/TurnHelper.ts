/**
 * TurnHelper.ts
 *
 * 게임 턴 관리 헬퍼 함수들
 * playCard와 passTurn에서 중복되는 다음 플레이어 찾기 로직을 통합합니다.
 */

/* eslint-disable no-param-reassign, no-plusplus, no-use-before-define */
import { Game, Player } from '../../types';

/**
 * 플레이어를 순위 순서대로 정렬합니다.
 * 순위(rank)가 낮을수록 높은 순위이므로 오름차순 정렬합니다.
 *
 * @param players - 정렬할 플레이어 배열
 * @returns 순위 순서로 정렬된 플레이어 배열
 *
 * @example
 * const sorted = getSortedPlayers(game.players);
 */
export function getSortedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => (a.rank || 0) - (b.rank || 0));
}

/**
 * 플레이어가 현재 활성 상태인지 확인합니다.
 * 활성 상태 = 카드가 있고, 게임을 완료하지 않은 상태
 *
 * @param player - 확인할 플레이어
 * @param finishedPlayers - 게임을 완료한 플레이어 ID 목록
 * @returns 활성 상태이면 true
 */
export function isPlayerActive(player: Player, finishedPlayers: string[]): boolean {
  return player.cards.length > 0 && !finishedPlayers.includes(player.id);
}

/**
 * 현재 플레이어로부터 다음 활성 플레이어를 찾습니다.
 * 순위 순서대로 순환하며, 카드가 있고 게임을 완료하지 않은 플레이어를 찾습니다.
 *
 * @param game - 게임 상태
 * @param currentPlayerId - 현재 플레이어 ID
 * @returns 다음 플레이어 ID (찾지 못하면 현재 플레이어 ID 반환)
 *
 * @example
 * const nextPlayerId = findNextPlayer(game, 'player1');
 * game.currentTurn = nextPlayerId;
 */
export function findNextPlayer(game: Game, currentPlayerId: string): string {
  const sortedPlayers = getSortedPlayers(game.players);
  const currentIndex = sortedPlayers.findIndex((p) => p.id === currentPlayerId);

  if (currentIndex === -1) {
    // 현재 플레이어를 찾을 수 없으면 첫 번째 활성 플레이어 반환
    return findFirstActivePlayer(game) || currentPlayerId;
  }

  let nextIndex = (currentIndex + 1) % sortedPlayers.length;
  let iterations = 0;

  // 최대 플레이어 수만큼만 순회 (무한 루프 방지)
  while (iterations < sortedPlayers.length) {
    const nextPlayer = sortedPlayers[nextIndex];

    if (isPlayerActive(nextPlayer, game.finishedPlayers)) {
      return nextPlayer.id;
    }

    nextIndex = (nextIndex + 1) % sortedPlayers.length;
    iterations++;
  }

  // 활성 플레이어를 찾지 못하면 현재 플레이어 반환
  return currentPlayerId;
}

/**
 * 특정 플레이어로부터 시작하여 다음 활성 플레이어를 찾습니다.
 * 라운드 종료 시 새 라운드를 시작할 플레이어를 찾을 때 사용합니다.
 *
 * @param game - 게임 상태
 * @param startPlayerId - 시작 플레이어 ID
 * @returns 다음 활성 플레이어 ID (찾지 못하면 시작 플레이어 ID 반환)
 *
 * @example
 * // 라운드 종료 후 마지막으로 카드를 낸 플레이어부터 시작
 * const nextPlayerId = findNextPlayerFrom(game, game.lastPlay.playerId);
 */
export function findNextPlayerFrom(game: Game, startPlayerId: string): string {
  const sortedPlayers = getSortedPlayers(game.players);
  const startIndex = sortedPlayers.findIndex((p) => p.id === startPlayerId);

  if (startIndex === -1) {
    // 시작 플레이어를 찾을 수 없으면 첫 번째 활성 플레이어 반환
    return findFirstActivePlayer(game) || startPlayerId;
  }

  let nextIndex = startIndex;
  let iterations = 0;

  // 최대 플레이어 수만큼만 순회 (무한 루프 방지)
  while (iterations < sortedPlayers.length) {
    const nextPlayer = sortedPlayers[nextIndex];

    if (isPlayerActive(nextPlayer, game.finishedPlayers)) {
      return nextPlayer.id;
    }

    nextIndex = (nextIndex + 1) % sortedPlayers.length;
    iterations++;
  }

  // 활성 플레이어를 찾지 못하면 시작 플레이어 반환
  return startPlayerId;
}

/**
 * 첫 번째 활성 플레이어를 찾습니다.
 * 게임 시작 시 또는 플레이어를 찾지 못했을 때 사용합니다.
 *
 * @param game - 게임 상태
 * @returns 첫 번째 활성 플레이어 ID (없으면 null)
 */
export function findFirstActivePlayer(game: Game): string | null {
  const sortedPlayers = getSortedPlayers(game.players);
  const firstActive = sortedPlayers.find((p) => isPlayerActive(p, game.finishedPlayers));
  return firstActive ? firstActive.id : null;
}

/**
 * 모든 플레이어(마지막 플레이어 제외)가 패스했는지 확인합니다.
 * 새로운 라운드를 시작할지 결정할 때 사용합니다.
 *
 * @param game - 게임 상태
 * @returns 모든 플레이어가 패스했으면 true
 *
 * @example
 * if (allPlayersPassedExceptLast(game)) {
 *   // 새 라운드 시작
 *   startNewRound(game);
 * }
 */
export function allPlayersPassedExceptLast(game: Game): boolean {
  if (!game.lastPlay || !game.lastPlay.playerId) {
    return false;
  }

  return game.players
    .filter((p) => !game.finishedPlayers.includes(p.id) && p.id !== game.lastPlay!.playerId)
    .every((p) => p.isPassed);
}

/**
 * 새로운 라운드를 시작합니다.
 * 라운드 번호를 증가시키고, 모든 플레이어의 패스 상태를 초기화하며,
 * 마지막 플레이를 지우고 다음 턴을 설정합니다.
 *
 * @param game - 게임 상태
 * @returns 업데이트된 게임 상태의 일부 (round, lastPlay, currentTurn)
 *
 * @example
 * const updates = startNewRound(game);
 * await db.updateGame(roomId, updates);
 */
export function startNewRound(game: Game): {
  round: number;
  lastPlay: undefined;
  currentTurn: string;
} {
  const prevLastPlayerId = game.lastPlay?.playerId;
  if (!prevLastPlayerId) {
    throw new Error('Cannot start new round without previous last play');
  }

  game.round++;
  game.lastPlay = undefined;

  // 모든 활성 플레이어의 패스 상태 초기화
  game.players.forEach((p) => {
    if (!game.finishedPlayers.includes(p.id)) {
      p.isPassed = false;
    }
  });

  // 마지막으로 카드를 낸 플레이어부터 다음 활성 플레이어 찾기
  const nextPlayerId = findNextPlayerFrom(game, prevLastPlayerId);

  return {
    round: game.round,
    lastPlay: undefined,
    currentTurn: nextPlayerId,
  };
}

/**
 * 게임 완료하지 않은 활성 플레이어 수를 반환합니다.
 *
 * @param game - 게임 상태
 * @returns 활성 플레이어 수
 */
export function countActivePlayers(game: Game): number {
  return game.players.filter((p) => isPlayerActive(p, game.finishedPlayers)).length;
}

/**
 * 플레이어가 마지막 남은 활성 플레이어인지 확인합니다.
 *
 * @param game - 게임 상태
 * @returns 마지막 남은 플레이어가 있으면 해당 플레이어, 없으면 null
 */
export function getLastActivePlayer(game: Game): Player | null {
  const activePlayers = game.players.filter((p) => isPlayerActive(p, game.finishedPlayers));

  if (activePlayers.length === 1) {
    return activePlayers[0];
  }

  return null;
}
