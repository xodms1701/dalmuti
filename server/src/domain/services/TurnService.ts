/**
 * TurnService.ts
 *
 * 턴 관리 도메인 서비스
 * 플레이어 순서, 패스 상태, 라운드 관리 등 턴 관련 비즈니스 로직을 담당
 *
 * Note: 기존 TurnHelper의 로직을 재사용하되, 도메인 엔티티를 사용하도록 변경
 */

import { Game } from '../entities/Game';
import { Player } from '../entities/Player';
import { PlayerId } from '../value-objects/PlayerId';
import * as TurnHelper from '../../../game/helpers/TurnHelper';
import type { Game as LegacyGame } from '../../../types';

/**
 * 다음 활성 플레이어를 찾습니다.
 * 현재 플레이어로부터 순위 순서대로 순환하며, 카드가 있고 게임을 완료하지 않은 플레이어를 찾습니다.
 *
 * @param game - 게임 엔티티
 * @param currentPlayerId - 현재 플레이어 ID
 * @returns 다음 플레이어 ID (찾지 못하면 null)
 */
export function findNextPlayer(game: Game, currentPlayerId: string): string | null {
  // Game 엔티티를 플레인 객체로 변환하여 기존 헬퍼 사용
  const gamePlain = game.toPlainObject();
  const nextPlayerId = TurnHelper.findNextPlayer(gamePlain as LegacyGame, currentPlayerId);

  // 현재 플레이어와 같다면 활성 플레이어를 찾지 못한 것
  if (nextPlayerId === currentPlayerId) {
    const firstActive = TurnHelper.findFirstActivePlayer(gamePlain as LegacyGame);
    return firstActive === currentPlayerId ? null : firstActive;
  }

  return nextPlayerId;
}

/**
 * 마지막 플레이어를 제외한 모든 플레이어가 패스했는지 확인합니다.
 * 새로운 라운드를 시작할지 결정할 때 사용합니다.
 *
 * @param game - 게임 엔티티
 * @returns 모든 플레이어가 패스했으면 true
 */
export function allPlayersPassedExceptLast(game: Game): boolean {
  const gamePlain = game.toPlainObject();
  return TurnHelper.allPlayersPassedExceptLast(gamePlain as LegacyGame);
}

/**
 * 새로운 라운드를 시작합니다.
 * 라운드 번호를 증가시키고, 모든 플레이어의 패스 상태를 초기화하며,
 * 마지막 플레이를 지우고 다음 턴을 설정합니다.
 *
 * @param game - 게임 엔티티
 */
export function startNewRound(game: Game): void {
  // 라운드 증가
  game.incrementRound();

  // 마지막 플레이 초기화
  const prevLastPlayerId = game.lastPlay?.playerId;
  game.setLastPlay(undefined);

  // 모든 활성 플레이어의 패스 상태 초기화
  const { players } = game;
  const { finishedPlayers } = game;

  players.forEach((player) => {
    if (!finishedPlayers.some((fp) => fp.equals(player.id))) {
      player.resetPass();
    }
  });

  // 마지막으로 카드를 낸 플레이어부터 다음 활성 플레이어 찾기
  if (prevLastPlayerId) {
    const gamePlain = game.toPlainObject();
    const nextPlayerIdString = TurnHelper.findNextPlayerFrom(
      gamePlain as LegacyGame,
      prevLastPlayerId.value
    );
    game.setCurrentTurn(PlayerId.create(nextPlayerIdString));
  }
}

/**
 * 플레이어를 순위 순서대로 정렬합니다.
 * 순위(rank)가 낮을수록 높은 순위이므로 오름차순 정렬합니다.
 *
 * @param players - 정렬할 플레이어 배열
 * @returns 순위 순서로 정렬된 플레이어 배열
 */
export function getSortedPlayers(players: Player[]): Player[] {
  // 불필요한 변환 없이 엔티티를 직접 정렬
  return [...players].sort((a, b) => (a.rank || 0) - (b.rank || 0));
}

/**
 * 활성 플레이어 수를 반환합니다.
 * 활성 플레이어 = 카드가 있고, 게임을 완료하지 않은 플레이어
 *
 * @param game - 게임 엔티티
 * @returns 활성 플레이어 수
 */
export function countActivePlayers(game: Game): number {
  const gamePlain = game.toPlainObject();
  return TurnHelper.countActivePlayers(gamePlain as LegacyGame);
}

/**
 * 마지막 남은 활성 플레이어를 반환합니다.
 *
 * @param game - 게임 엔티티
 * @returns 마지막 남은 플레이어가 있으면 해당 플레이어, 없으면 null
 */
export function getLastActivePlayer(game: Game): Player | null {
  const gamePlain = game.toPlainObject();
  const lastActive = TurnHelper.getLastActivePlayer(gamePlain as LegacyGame);

  if (!lastActive) {
    return null;
  }

  return Player.fromPlainObject(lastActive);
}

/**
 * 첫 번째 활성 플레이어를 찾습니다.
 * 게임 시작 시 또는 플레이어를 찾지 못했을 때 사용합니다.
 *
 * @param game - 게임 엔티티
 * @returns 첫 번째 활성 플레이어 ID (없으면 null)
 */
export function findFirstActivePlayer(game: Game): string | null {
  const gamePlain = game.toPlainObject();
  return TurnHelper.findFirstActivePlayer(gamePlain as LegacyGame);
}
