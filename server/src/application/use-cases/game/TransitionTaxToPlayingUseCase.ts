/**
 * TransitionTaxToPlayingUseCase.ts
 *
 * 세금 교환 페이즈에서 플레이 페이즈로 자동 전환하는 유스케이스
 *
 * 책임:
 * 1. RoomId를 Value Object로 변환
 * 2. Game Repository에서 게임 조회
 * 3. 현재 페이즈가 'tax'인지 확인
 * 4. 'tax'이면 'playing'으로 변경
 * 5. 변경사항 영속화
 * 6. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import {
  TransitionTaxToPlayingRequest,
  TransitionTaxToPlayingResponse,
} from '../../dto/game/TransitionTaxToPlayingDto';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../dto/common/BaseResponse';
import { ResourceNotFoundError, ValidationError } from '../../errors/ApplicationError';

/**
 * TransitionTaxToPlayingUseCase
 *
 * 세금 교환 페이즈에서 플레이 페이즈로 자동 전환합니다.
 * 10초 타이머가 만료되었을 때 호출됩니다.
 */
export class TransitionTaxToPlayingUseCase
  implements IUseCase<TransitionTaxToPlayingRequest, UseCaseResponse<TransitionTaxToPlayingResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(
    request: TransitionTaxToPlayingRequest
  ): Promise<UseCaseResponse<TransitionTaxToPlayingResponse>> {
    try {
      // 1. Value Object로 변환
      let roomId: RoomId;

      try {
        roomId = RoomId.from(request.roomId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid room ID format',
          'roomId'
        );
      }

      // 2. Game Repository에서 게임 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 현재 페이즈가 'tax'인지 확인
      let transitioned = false;

      if (game.phase === 'tax') {
        // 4. 'playing'으로 변경
        game.changePhase('playing');

        // 5. 변경사항 영속화
        await this.gameRepository.update(roomId, game);

        transitioned = true;
      }

      // 6. Response DTO 반환
      return createSuccessResponse<TransitionTaxToPlayingResponse>({
        roomId: game.roomId.value,
        phase: game.phase,
        transitioned,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError) {
        return createErrorResponse(error.code, error.message, { field: error.field });
      }

      if (error instanceof ResourceNotFoundError) {
        return createErrorResponse(error.code, error.message);
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'TRANSITION_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
