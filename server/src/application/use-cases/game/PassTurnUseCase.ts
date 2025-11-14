/**
 * PassTurnUseCase.ts
 *
 * 턴 패스 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId를 Value Object로 변환
 * 2. Game Entity 조회
 * 3. Player 조회 및 패스 처리
 * 4. 다음 턴 계산
 * 5. 모든 플레이어 패스 여부 확인
 * 6. Repository를 통한 영속화
 * 7. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { PassTurnRequest, PassTurnResponse } from '../../dto/game/PassTurnDto';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../dto/common/BaseResponse';
import {
  ResourceNotFoundError,
  ValidationError,
  BusinessRuleError,
} from '../../errors/ApplicationError';
import * as TurnService from '../../../domain/services/TurnService';

/**
 * PassTurnUseCase
 *
 * 플레이어의 턴을 패스하고 다음 턴으로 넘어갑니다.
 */
export class PassTurnUseCase
  implements IUseCase<PassTurnRequest, UseCaseResponse<PassTurnResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: PassTurnRequest): Promise<UseCaseResponse<PassTurnResponse>> {
    try {
      // 1. RoomId, PlayerId를 Value Object로 변환
      let roomId: RoomId;
      let playerId: PlayerId;

      try {
        roomId = RoomId.from(request.roomId);
        playerId = PlayerId.create(request.playerId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid room ID or player ID format',
          'roomId/playerId'
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

      // 4. 플레이어 패스 처리
      try {
        player.pass();
      } catch (error) {
        throw new BusinessRuleError(error instanceof Error ? error.message : 'Failed to pass turn');
      }

      // 5. 다음 턴 계산
      const nextPlayerId = TurnService.findNextPlayer(game, playerId.value);
      if (nextPlayerId) {
        game.setCurrentTurn(PlayerId.create(nextPlayerId));
      }

      // 6. 모든 플레이어가 패스했는지 확인
      const allPlayersPassed = TurnService.allPlayersPassedExceptLast(game);

      // 7. 새로운 라운드 시작 여부 확인
      if (allPlayersPassed) {
        try {
          TurnService.startNewRound(game);
        } catch (error) {
          throw new BusinessRuleError(
            error instanceof Error ? error.message : 'Failed to start new round'
          );
        }
      }

      // 8. Repository를 통해 영속화
      await this.gameRepository.update(game.roomId, game);

      // 9. Response DTO 반환
      return createSuccessResponse<PassTurnResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        nextTurn: game.currentTurn ? game.currentTurn.value : null,
        allPlayersPassed,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError) {
        return createErrorResponse(error.code, error.message, { field: error.field });
      }

      if (error instanceof ResourceNotFoundError) {
        return createErrorResponse(error.code, error.message);
      }

      if (error instanceof BusinessRuleError) {
        return createErrorResponse(error.code, error.message);
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'PASS_TURN_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
