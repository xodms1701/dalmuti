/**
 * GameQueryService.ts
 *
 * CQRS Pattern - Query Service
 *
 * 게임 상태 조회 전담 서비스
 * 상태 변경 없이 순수한 조회만 담당합니다.
 *
 * 책임:
 * - 게임 상태 조회
 * - 조회 결과를 Presentation Layer에 적합한 형태로 변환
 *
 * 향후 확장:
 * - 조회 성능 최적화 (캐싱, ReadModel 등)
 * - 복잡한 조회 쿼리 (검색, 필터링, 페이징 등)
 */

import { IGameRepository } from '../ports/IGameRepository';
import { RoomId } from '../../domain/value-objects/RoomId';

/**
 * GameQueryService
 *
 * 게임 관련 조회 작업을 담당합니다.
 */
export class GameQueryService {
  constructor(private readonly gameRepository: IGameRepository) {}

  /**
   * 게임 상태 조회
   *
   * 게임의 현재 상태를 조회하여 PlainObject 형태로 반환합니다.
   *
   * @param roomId - 방 ID
   * @returns 게임 상태 (PlainObject 형태) 또는 null
   */
  async getGameState(roomId: string) {
    try {
      const game = await this.gameRepository.findById(RoomId.from(roomId));
      return game ? game.toPlainObject() : null;
    } catch (error) {
      console.error(`Failed to get game state for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * 여러 게임 상태 조회 (향후 확장)
   *
   * @returns 모든 게임 상태 목록
   */
  // async getAllGames(): Promise<any[]> {
  //   const games = await this.gameRepository.findAll();
  //   return games.map(game => game.toPlainObject());
  // }
}
