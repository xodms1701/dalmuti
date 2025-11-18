/**
 * CreateGameDto.ts
 *
 * CreateGameUseCase의 Request/Response DTO 정의
 */

/**
 * 게임 생성 요청
 */
export interface CreateGameRequest {
  /**
   * 방 ID (선택사항)
   * 지정하지 않으면 자동으로 6자리 영숫자 코드 생성
   */
  roomId?: string;

  /**
   * 방장 ID (생성자 플레이어 ID)
   */
  ownerId: string;
}

/**
 * 게임 생성 응답
 */
export interface CreateGameResponse {
  /**
   * 생성된 게임의 방 ID
   */
  roomId: string;

  /**
   * 게임 페이즈
   */
  phase: string;

  /**
   * 생성 시각
   */
  createdAt: Date;
}
