/**
 * ReadyGameUseCase.ts
 *
 * 게임 준비 상태 변경 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId Value Object 변환
 * 2. Game Entity 조회
 * 3. Player 조회 및 준비 상태 변경
 * 4. Repository를 통한 업데이트
 * 5. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { ReadyGameRequest, ReadyGameResponse } from '../../dto/game/ReadyGameDto';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../dto/common/BaseResponse';
import { ResourceNotFoundError, ValidationError } from '../../errors/ApplicationError';

/**
 * ReadyGameUseCase
 *
 * 플레이어의 게임 준비 상태를 변경합니다.
 */
export class ReadyGameUseCase
  implements IUseCase<ReadyGameRequest, UseCaseResponse<ReadyGameResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: ReadyGameRequest): Promise<UseCaseResponse<ReadyGameResponse>> {
    try {
      // 1. Value Object 변환
      let roomId: RoomId;
      let playerId: PlayerId;

      try {
        roomId = RoomId.from(request.roomId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid room ID format',
          'roomId'
        );
      }

      try {
        playerId = PlayerId.create(request.playerId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid player ID format',
          'playerId'
        );
      }

      // 2. Game Entity 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. Player 조회
      const player = game.getPlayer(playerId);
      if (!player) {
        throw new ResourceNotFoundError('Player', playerId.value);
      }

      // 4. 준비 상태 결정
      // isReady가 undefined면 현재 상태를 토글, 값이 있으면 그 값 사용
      const targetReadyState = request.isReady !== undefined ? request.isReady : !player.isReady;

      // 5. 준비 상태 변경
      if (targetReadyState) {
        player.ready();
      } else {
        player.unready();
      }

      // 6. Repository를 통해 업데이트
      await this.gameRepository.update(roomId, game);

      // 7. 모든 플레이어 준비 완료 여부 확인
      const allPlayersReady = game.players.length > 0 && game.players.every((p) => p.isReady);

      // 8. Response DTO 반환
      return createSuccessResponse<ReadyGameResponse>({
        roomId: game.roomId.value,
        playerId: player.id.value,
        isReady: player.isReady,
        playerCount: game.players.length,
        allPlayersReady,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        return createErrorResponse(
          error.code,
          error.message,
          error instanceof ValidationError ? { field: error.field } : undefined
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'READY_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
