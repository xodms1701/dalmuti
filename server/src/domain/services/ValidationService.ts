/**
 * ValidationService.ts
 *
 * 검증 도메인 서비스
 * 게임 상태 및 플레이어 액션의 유효성을 검증하는 비즈니스 로직을 담당
 *
 * Note: 기존 GameValidator의 로직을 재사용하되, 도메인 엔티티를 사용하도록 변경
 */

import { Game } from '../entities/Game';
import { Card } from '../entities/Card';
import { PlayerId } from '../value-objects/PlayerId';
import * as GameValidator from '../../../game/helpers/GameValidator';

/**
 * 검증 결과 타입
 */
export interface ValidationResult {
  success: boolean;
  error?: string;
}

/**
 * 게임이 특정 페이즈인지 검증합니다.
 *
 * @param game - 검증할 게임 엔티티
 * @param expectedPhase - 기대되는 페이즈
 * @returns 검증 결과
 */
export function validateGameState(game: Game, expectedPhase: string): ValidationResult {
  if (game.phase !== expectedPhase) {
    return {
      success: false,
      error: `게임이 ${expectedPhase} 페이즈가 아닙니다. (현재: ${game.phase})`,
    };
  }
  return { success: true };
}

/**
 * 플레이어 액션의 유효성을 검증합니다.
 * - 플레이어의 턴인지 확인
 * - 플레이어가 패스하지 않았는지 확인
 * - 플레이어가 게임을 완료하지 않았는지 확인
 *
 * @param game - 검증할 게임 엔티티
 * @param playerId - 플레이어 ID
 * @returns 검증 결과
 */
export function validatePlayerAction(game: Game, playerId: string): ValidationResult {
  // 게임 엔티티를 플레인 객체로 변환
  const gamePlain = game.toPlainObject();

  // 플레이어 찾기
  const playerResult = GameValidator.validatePlayer(gamePlain as any, playerId);
  if (!playerResult.success) {
    return { success: false, error: playerResult.error };
  }

  const player = playerResult.data;

  // 현재 턴인지 확인
  const turnResult = GameValidator.validateTurn(gamePlain as any, playerId);
  if (!turnResult.success) {
    return { success: false, error: turnResult.error };
  }

  // 패스하지 않았는지 확인
  const notPassedResult = GameValidator.validateNotPassed(player);
  if (!notPassedResult.success) {
    return { success: false, error: notPassedResult.error };
  }

  // 게임을 완료하지 않았는지 확인
  const notFinishedResult = GameValidator.validateNotFinished(gamePlain as any, playerId);
  if (!notFinishedResult.success) {
    return { success: false, error: notFinishedResult.error };
  }

  return { success: true };
}

/**
 * 카드의 유효성을 검증합니다.
 * - 같은 숫자인지 확인 (조커 제외)
 * - lastPlay보다 강한지 확인 (낮은 숫자가 강함)
 * - lastPlay와 같은 개수인지 확인
 *
 * @param cards - 검증할 카드 배열
 * @param lastPlay - 마지막 플레이 정보 (선택)
 * @returns 검증 결과
 */
export function validateCards(
  cards: any[],
  lastPlay?: { playerId: string; cards: any[] }
): ValidationResult {
  if (!cards || cards.length === 0) {
    return { success: false, error: '카드를 선택해주세요.' };
  }

  // 같은 숫자인지 확인
  const sameRankResult = GameValidator.validateSameRank(cards);
  if (!sameRankResult.success) {
    return { success: false, error: sameRankResult.error };
  }

  // lastPlay가 있는 경우
  if (lastPlay) {
    // 카드 개수 확인
    const cardCountResult = GameValidator.validateCardCount(cards, lastPlay);
    if (!cardCountResult.success) {
      return { success: false, error: cardCountResult.error };
    }

    // 카드 강도 확인
    const strongerResult = GameValidator.validateCardsStrongerThanLast(cards, lastPlay);
    if (!strongerResult.success) {
      return { success: false, error: strongerResult.error };
    }
  }

  return { success: true };
}

/**
 * 카드가 모두 같은 숫자인지 검증합니다 (조커 제외).
 *
 * @param cards - 검증할 카드 배열
 * @returns 검증 결과
 */
export function validateSameRank(cards: any[]): ValidationResult {
  const result = GameValidator.validateSameRank(cards);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true };
}

/**
 * 플레이어가 해당 카드를 가지고 있는지 검증합니다.
 *
 * @param game - 게임 엔티티
 * @param playerId - 플레이어 ID
 * @param cards - 검증할 카드 배열
 * @returns 검증 결과
 */
export function validatePlayerHasCards(
  game: Game,
  playerId: PlayerId,
  cards: any[]
): ValidationResult {
  const player = game.getPlayer(playerId);
  if (!player) {
    return { success: false, error: '플레이어를 찾을 수 없습니다.' };
  }

  const playerPlain = player.toPlainObject();
  const result = GameValidator.validatePlayerHasCards(playerPlain as any, cards);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * 최소 플레이어 수를 검증합니다.
 *
 * @param game - 게임 엔티티
 * @param minPlayers - 최소 플레이어 수
 * @returns 검증 결과
 */
export function validateMinPlayers(game: Game, minPlayers: number): ValidationResult {
  const gamePlain = game.toPlainObject();
  const result = GameValidator.validateMinPlayers(gamePlain as any, minPlayers);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * 최대 플레이어 수를 검증합니다.
 *
 * @param game - 게임 엔티티
 * @param maxPlayers - 최대 플레이어 수
 * @returns 검증 결과
 */
export function validateMaxPlayers(game: Game, maxPlayers: number): ValidationResult {
  const gamePlain = game.toPlainObject();
  const result = GameValidator.validateMaxPlayers(gamePlain as any, maxPlayers);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * 모든 플레이어가 준비 상태인지 검증합니다.
 *
 * @param game - 게임 엔티티
 * @returns 검증 결과
 */
export function validateAllPlayersReady(game: Game): ValidationResult {
  const gamePlain = game.toPlainObject();
  const result = GameValidator.validateAllPlayersReady(gamePlain as any);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}
