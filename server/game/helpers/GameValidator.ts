/**
 * GameValidator.ts
 *
 * 게임 상태 및 플레이어 액션의 유효성을 검증하는 헬퍼 함수들
 * 11개 메서드에 중복되어 있던 검증 로직을 통합합니다.
 */

import { Game, Player, Card } from '../../types';
import { GameResult, ErrorCode, failure, success } from '../types/GameResult';

/**
 * 게임 존재 여부를 검증합니다.
 *
 * @param game - 검증할 게임 객체 (null 가능)
 * @returns 게임이 없으면 실패 결과, 있으면 게임 객체를 포함한 성공 결과
 *
 * @example
 * const result = validateGameExists(game);
 * if (!result.success) return result;
 * const validGame = result.data;
 */
export function validateGameExists(game: Game | null): GameResult<Game> {
  if (!game) {
    return failure('게임을 찾을 수 없습니다.', ErrorCode.GAME_NOT_FOUND);
  }
  return success(game);
}

/**
 * 게임이 특정 페이즈인지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param expectedPhase - 기대되는 페이즈
 * @param actionName - 액션 이름 (에러 메시지용)
 * @returns 페이즈가 다르면 실패 결과, 같으면 성공 결과
 *
 * @example
 * const result = validatePhase(game, 'playing', '카드 내기');
 * if (!result.success) return result;
 */
export function validatePhase(
  game: Game,
  expectedPhase: Game['phase'],
  actionName: string
): GameResult<void> {
  if (game.phase !== expectedPhase) {
    return failure(
      `${actionName}는 ${expectedPhase} 페이즈에서만 가능합니다. (현재: ${game.phase})`,
      ErrorCode.WRONG_PHASE_FOR_ACTION
    );
  }
  return success(undefined);
}

/**
 * 게임이 여러 페이즈 중 하나인지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param expectedPhases - 허용되는 페이즈 배열
 * @param actionName - 액션 이름 (에러 메시지용)
 * @returns 페이즈가 허용 목록에 없으면 실패 결과, 있으면 성공 결과
 */
export function validatePhases(
  game: Game,
  expectedPhases: Game['phase'][],
  actionName: string
): GameResult<void> {
  if (!expectedPhases.includes(game.phase)) {
    return failure(
      `${actionName}는 ${expectedPhases.join(', ')} 페이즈에서만 가능합니다. (현재: ${game.phase})`,
      ErrorCode.WRONG_PHASE_FOR_ACTION
    );
  }
  return success(undefined);
}

/**
 * 플레이어가 게임에 존재하는지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param playerId - 플레이어 ID
 * @returns 플레이어가 없으면 실패 결과, 있으면 플레이어 객체를 포함한 성공 결과
 *
 * @example
 * const result = validatePlayer(game, playerId);
 * if (!result.success) return result;
 * const player = result.data;
 */
export function validatePlayer(game: Game, playerId: string): GameResult<Player> {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return failure('플레이어를 찾을 수 없습니다.', ErrorCode.PLAYER_NOT_FOUND);
  }
  return success(player);
}

/**
 * 현재 플레이어의 턴인지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param playerId - 플레이어 ID
 * @returns 턴이 아니면 실패 결과, 맞으면 성공 결과
 *
 * @example
 * const result = validateTurn(game, playerId);
 * if (!result.success) return result;
 */
export function validateTurn(game: Game, playerId: string): GameResult<void> {
  if (game.currentTurn !== playerId) {
    return failure('현재 당신의 턴이 아닙니다.', ErrorCode.NOT_YOUR_TURN);
  }
  return success(undefined);
}

/**
 * 플레이어가 이미 패스했는지 검증합니다.
 *
 * @param player - 검증할 플레이어 객체
 * @returns 이미 패스했으면 실패 결과, 아니면 성공 결과
 */
export function validateNotPassed(player: Player): GameResult<void> {
  if (player.isPassed) {
    return failure('이미 패스한 상태입니다.', ErrorCode.TURN_ALREADY_PASSED);
  }
  return success(undefined);
}

/**
 * 플레이어가 이미 게임을 완료했는지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param playerId - 플레이어 ID
 * @returns 이미 완료했으면 실패 결과, 아니면 성공 결과
 */
export function validateNotFinished(game: Game, playerId: string): GameResult<void> {
  if (game.finishedPlayers.includes(playerId)) {
    return failure('이미 게임을 완료한 플레이어입니다.', ErrorCode.PLAYER_ALREADY_FINISHED);
  }
  return success(undefined);
}

/**
 * 카드가 모두 같은 숫자인지 검증합니다 (조커 제외).
 *
 * @param cards - 검증할 카드 배열
 * @returns 같은 숫자가 아니면 실패 결과, 맞으면 성공 결과
 */
export function validateSameRank(cards: Card[]): GameResult<void> {
  const nonJokerCards = cards.filter((c) => !c.isJoker);
  if (nonJokerCards.length === 0) return success(undefined); // 모두 조커인 경우 통과

  const firstRank = nonJokerCards[0].rank;
  const allSameRank = nonJokerCards.every((c) => c.rank === firstRank);

  if (!allSameRank) {
    return failure(
      '여러 장을 낼 때는 같은 숫자의 카드만 낼 수 있습니다.',
      ErrorCode.CARDS_NOT_SAME_RANK
    );
  }

  return success(undefined);
}

/**
 * 카드가 이전 플레이보다 강한지 검증합니다 (낮은 숫자가 강함).
 *
 * @param cards - 검증할 카드 배열
 * @param lastPlay - 이전 플레이 정보
 * @returns 카드가 약하면 실패 결과, 강하면 성공 결과
 */
export function validateCardsStrongerThanLast(
  cards: Card[],
  lastPlay: { playerId: string; cards: Card[] } | undefined
): GameResult<void> {
  if (!lastPlay || lastPlay.cards.length === 0) {
    return success(undefined); // 이전 플레이가 없으면 항상 유효
  }

  const lastCard = lastPlay.cards[0];
  const nonJokerCards = cards.filter((c) => !c.isJoker);

  // 모두 조커인 경우, 항상 유효
  if (nonJokerCards.length === 0) {
    return success(undefined);
  }

  const cardRank = nonJokerCards[0].rank;

  // 낮은 숫자가 강함: cardRank < lastCard.rank 여야 함
  if (cardRank >= lastCard.rank) {
    return failure(
      `이전 카드(${lastCard.rank})보다 낮은 숫자를 내야 합니다.`,
      ErrorCode.CARDS_TOO_WEAK
    );
  }

  return success(undefined);
}

/**
 * 카드 개수가 이전 플레이와 같은지 검증합니다.
 *
 * @param cards - 검증할 카드 배열
 * @param lastPlay - 이전 플레이 정보
 * @returns 개수가 다르면 실패 결과, 같으면 성공 결과
 */
export function validateCardCount(
  cards: Card[],
  lastPlay: { playerId: string; cards: Card[] } | undefined
): GameResult<void> {
  if (!lastPlay || lastPlay.cards.length === 0) {
    return success(undefined); // 이전 플레이가 없으면 항상 유효
  }

  if (cards.length !== lastPlay.cards.length) {
    return failure(
      `이전 플레이와 같은 개수(${lastPlay.cards.length}장)를 내야 합니다.`,
      ErrorCode.INVALID_CARD_COUNT
    );
  }

  return success(undefined);
}

/**
 * 플레이어가 해당 카드를 가지고 있는지 검증합니다.
 * 중복된 카드를 내는 경우도 정확히 검증합니다.
 *
 * @param player - 플레이어 객체
 * @param cardsToPlay - 낼 카드 배열
 * @returns 카드를 가지고 있지 않으면 실패 결과, 가지고 있으면 성공 결과
 */
export function validatePlayerHasCards(player: Player, cardsToPlay: Card[]): GameResult<void> {
  const hand = [...player.cards];
  for (const cardToPlay of cardsToPlay) {
    const cardIndex = hand.findIndex(
      (c) => c.rank === cardToPlay.rank && c.isJoker === cardToPlay.isJoker
    );
    if (cardIndex === -1) {
      return failure(
        `플레이어가 해당 카드를 가지고 있지 않습니다: ${cardToPlay.isJoker ? '조커' : cardToPlay.rank}`,
        ErrorCode.CARD_NOT_IN_HAND
      );
    }
    hand.splice(cardIndex, 1); // 카드를 "사용"하여 중복 체크
  }
  return success(undefined);
}

/**
 * 최소 플레이어 수를 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param minPlayers - 최소 플레이어 수
 * @returns 플레이어 수가 부족하면 실패 결과, 충분하면 성공 결과
 */
export function validateMinPlayers(game: Game, minPlayers: number): GameResult<void> {
  if (game.players.length < minPlayers) {
    return failure(
      `최소 ${minPlayers}명의 플레이어가 필요합니다.`,
      ErrorCode.NOT_ENOUGH_PLAYERS
    );
  }
  return success(undefined);
}

/**
 * 최대 플레이어 수를 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param maxPlayers - 최대 플레이어 수
 * @returns 플레이어 수가 초과하면 실패 결과, 아니면 성공 결과
 */
export function validateMaxPlayers(game: Game, maxPlayers: number): GameResult<void> {
  if (game.players.length >= maxPlayers) {
    return failure(`최대 ${maxPlayers}명까지 참가할 수 있습니다.`, ErrorCode.GAME_FULL);
  }
  return success(undefined);
}

/**
 * 모든 플레이어가 준비 상태인지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @returns 준비하지 않은 플레이어가 있으면 실패 결과, 모두 준비되었으면 성공 결과
 */
export function validateAllPlayersReady(game: Game): GameResult<void> {
  const allReady = game.players.every((p) => p.isReady);
  if (!allReady) {
    return failure('모든 플레이어가 준비 상태가 아닙니다.', ErrorCode.PLAYER_NOT_READY);
  }
  return success(undefined);
}

/**
 * 역할 번호가 유효한 범위인지 검증합니다.
 *
 * @param roleNumber - 역할 번호
 * @returns 유효하지 않으면 실패 결과, 유효하면 성공 결과
 */
export function validateRoleNumber(roleNumber: number): GameResult<void> {
  if (roleNumber < 1 || roleNumber > 13) {
    return failure('역할 번호는 1부터 13 사이여야 합니다.', ErrorCode.INVALID_ROLE_NUMBER);
  }
  return success(undefined);
}

/**
 * 덱 인덱스가 유효한 범위인지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param deckIndex - 덱 인덱스
 * @returns 유효하지 않으면 실패 결과, 유효하면 성공 결과
 */
export function validateDeckIndex(game: Game, deckIndex: number): GameResult<void> {
  if (!game.selectableDecks || deckIndex < 0 || deckIndex >= game.selectableDecks.length) {
    return failure('유효하지 않은 덱 인덱스입니다.', ErrorCode.INVALID_DECK_INDEX);
  }
  return success(undefined);
}

/**
 * 덱이 이미 선택되지 않았는지 검증합니다.
 *
 * @param game - 검증할 게임 객체
 * @param deckIndex - 덱 인덱스
 * @returns 이미 선택되었으면 실패 결과, 아니면 성공 결과
 */
export function validateDeckNotSelected(game: Game, deckIndex: number): GameResult<void> {
  if (game.selectableDecks && game.selectableDecks[deckIndex].isSelected) {
    return failure('이미 선택된 덱입니다.', ErrorCode.DECK_ALREADY_SELECTED);
  }
  return success(undefined);
}
