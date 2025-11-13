import { Game } from '../../domain/entities/Game';

/**
 * Game Repository Interface (Port)
 *
 * Application Layer의 Port로, Infrastructure Layer의 Adapter가 구현합니다.
 * Hexagonal Architecture에 따라 의존성 방향: Infrastructure → Application
 */
export interface IGameRepository {
  /**
   * roomId로 게임을 조회합니다.
   * @param roomId - 방 ID
   * @returns 게임 Entity 또는 null
   */
  findById(roomId: string): Promise<Game | null>;

  /**
   * 새 게임을 저장합니다.
   * @param game - 저장할 게임 Entity
   */
  save(game: Game): Promise<void>;

  /**
   * 게임을 삭제합니다.
   * @param roomId - 삭제할 방 ID
   */
  delete(roomId: string): Promise<void>;

  /**
   * 게임을 부분 업데이트합니다.
   * @param roomId - 업데이트할 방 ID
   * @param updates - 업데이트할 필드들
   * @returns 업데이트된 게임 Entity 또는 null
   */
  update(roomId: string, updates: Partial<Game>): Promise<Game | null>;

  /**
   * 모든 게임을 조회합니다.
   * @returns 모든 게임 Entity 배열
   */
  findAll(): Promise<Game[]>;
}
