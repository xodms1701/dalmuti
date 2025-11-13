/**
 * GameResult.ts
 *
 * 게임 작업의 결과를 표현하는 통합 타입 정의
 * 모든 GameManager 메서드의 반환 타입을 일관되게 표준화합니다.
 */

/**
 * 에러 코드 열거형
 * 게임 작업 중 발생할 수 있는 모든 에러 유형을 정의합니다.
 */
export enum ErrorCode {
  // 게임 상태 관련 에러
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_ALREADY_STARTED = 'GAME_ALREADY_STARTED',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  GAME_FULL = 'GAME_FULL',

  // 페이즈 관련 에러
  INVALID_PHASE = 'INVALID_PHASE',
  WRONG_PHASE_FOR_ACTION = 'WRONG_PHASE_FOR_ACTION',

  // 플레이어 관련 에러
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  PLAYER_ALREADY_EXISTS = 'PLAYER_ALREADY_EXISTS',
  PLAYER_NOT_READY = 'PLAYER_NOT_READY',
  PLAYER_ALREADY_FINISHED = 'PLAYER_ALREADY_FINISHED',
  NOT_ENOUGH_PLAYERS = 'NOT_ENOUGH_PLAYERS',
  TOO_MANY_PLAYERS = 'TOO_MANY_PLAYERS',

  // 턴 관련 에러
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  TURN_ALREADY_PASSED = 'TURN_ALREADY_PASSED',

  // 카드 관련 에러
  INVALID_CARDS = 'INVALID_CARDS',
  INVALID_CARD_COUNT = 'INVALID_CARD_COUNT',
  CARDS_TOO_WEAK = 'CARDS_TOO_WEAK',
  CARDS_NOT_SAME_RANK = 'CARDS_NOT_SAME_RANK',
  CARD_NOT_IN_HAND = 'CARD_NOT_IN_HAND',

  // 역할 선택 관련 에러
  ROLE_ALREADY_SELECTED = 'ROLE_ALREADY_SELECTED',
  INVALID_ROLE_NUMBER = 'INVALID_ROLE_NUMBER',

  // 덱 선택 관련 에러
  DECK_ALREADY_SELECTED = 'DECK_ALREADY_SELECTED',
  INVALID_DECK_INDEX = 'INVALID_DECK_INDEX',
  NOT_YOUR_TURN_TO_SELECT = 'NOT_YOUR_TURN_TO_SELECT',

  // 혁명 관련 에러
  NO_DOUBLE_JOKER = 'NO_DOUBLE_JOKER',
  REVOLUTION_ALREADY_DECIDED = 'REVOLUTION_ALREADY_DECIDED',

  // 투표 관련 에러
  VOTE_ALREADY_CAST = 'VOTE_ALREADY_CAST',

  // 기타
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 게임 작업 결과를 나타내는 통합 인터페이스
 *
 * @template T - 성공 시 반환될 데이터의 타입 (기본값: Game)
 *
 * @example
 * // 성공 케이스
 * const result: GameResult = {
 *   success: true,
 *   data: game
 * };
 *
 * @example
 * // 실패 케이스
 * const result: GameResult = {
 *   success: false,
 *   error: '게임을 찾을 수 없습니다.',
 *   code: ErrorCode.GAME_NOT_FOUND
 * };
 */
export interface GameResult<T = any> {
  /**
   * 작업 성공 여부
   */
  success: boolean;

  /**
   * 성공 시 반환할 데이터
   * success가 true일 때만 존재
   */
  data?: T;

  /**
   * 실패 시 에러 메시지
   * success가 false일 때 존재해야 함
   */
  error?: string;

  /**
   * 실패 시 에러 코드
   * success가 false일 때 존재해야 함
   * 클라이언트에서 에러 유형별 처리를 위해 사용
   */
  code?: ErrorCode;
}

/**
 * 성공 결과를 생성하는 헬퍼 함수
 *
 * @template T - 반환할 데이터의 타입
 * @param data - 성공 시 반환할 데이터
 * @returns 성공 결과 객체
 *
 * @example
 * return success(game);
 */
export function success<T>(data: T): GameResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 실패 결과를 생성하는 헬퍼 함수
 *
 * @param error - 에러 메시지
 * @param code - 에러 코드
 * @returns 실패 결과 객체
 *
 * @example
 * return failure('게임을 찾을 수 없습니다.', ErrorCode.GAME_NOT_FOUND);
 */
export function failure(error: string, code: ErrorCode): GameResult {
  return {
    success: false,
    error,
    code,
  };
}
