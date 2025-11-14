/**
 * SelectRevolutionUseCase.ts
 *
 * 혁명 선택 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId Value Object 변환
 * 2. Game Entity 조회
 * 3. 혁명 선택 처리 (Game Entity의 processRevolutionChoice 호출)
 * 4. Repository를 통한 업데이트
 * 5. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import {
  SelectRevolutionRequest,
  SelectRevolutionResponse,
} from '../../dto/game/SelectRevolutionDto';
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
import * as TaxService from '../../../domain/services/TaxService';

/**
 * SelectRevolutionUseCase
 *
 * 조커 2장 보유 플레이어가 혁명 여부를 선택합니다.
 * - 혁명 선택 시: 대혁명(꼴찌면 순위 반전) 또는 일반혁명 → playing 페이즈
 * - 혁명 거부 시: 세금 교환 → tax 페이즈
 */
export class SelectRevolutionUseCase
  implements IUseCase<SelectRevolutionRequest, UseCaseResponse<SelectRevolutionResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(
    request: SelectRevolutionRequest
  ): Promise<UseCaseResponse<SelectRevolutionResponse>> {
    try {
      // 1. Value Object 변환
      let roomId: RoomId;
      let playerId: PlayerId;

      try {
        roomId = RoomId.from(request.roomId);
        playerId = PlayerId.create(request.playerId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid request parameters',
          'roomId or playerId'
        );
      }

      // 2. Game Entity 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 혁명 선택 처리 (Game Entity에 위임)
      game.processRevolutionChoice(playerId, request.wantRevolution);

      // 4. 혁명 거부 시 세금 교환 수행
      if (!request.wantRevolution) {
        // Domain Service를 통해 세금 교환 처리
        const taxExchanges = TaxService.initializeTaxExchanges(game.players);
        game.setTaxExchanges(taxExchanges);

        // 세금 교환 후 playing 페이즈로 전환 준비
        // (Legacy에서는 10초 타이머 사용, 여기서는 클라이언트에서 처리)
        game.setCurrentTurn(
          game.players.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0].id
        );
        game.incrementRound();
      }

      // 5. Repository를 통해 업데이트
      await this.gameRepository.update(roomId, game);

      // 6. Response DTO 반환
      return createSuccessResponse<SelectRevolutionResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        wantRevolution: request.wantRevolution,
        phase: game.phase,
        revolutionStatus: game.revolutionStatus,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (
        error instanceof ValidationError ||
        error instanceof ResourceNotFoundError ||
        error instanceof BusinessRuleError
      ) {
        return createErrorResponse(
          error.code,
          error.message,
          error instanceof ValidationError ? { field: error.field } : undefined
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'SELECT_REVOLUTION_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
