/**
 * DeleteGameUseCase.ts
 *
 * 게임 삭제 유스케이스
 *
 * 책임:
 * 1. RoomId Value Object 변환
 * 2. Repository를 통한 게임 삭제
 * 3. Response DTO 반환
 *
 * 주로 보상 트랜잭션(Compensating Transaction)에서 사용됩니다.
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { UseCaseResponse, createSuccessResponse, createErrorResponse } from '../../dto/common/BaseResponse';
import { ValidationError, ResourceNotFoundError } from '../../errors/ApplicationError';
import { NotFoundError } from '../../ports/RepositoryError';

/**
 * 게임 삭제 요청
 */
export interface DeleteGameRequest {
  /**
   * 방 ID
   */
  roomId: string;
}

/**
 * 게임 삭제 응답
 */
export interface DeleteGameResponse {
  /**
   * 삭제된 방 ID
   */
  roomId: string;
}

/**
 * DeleteGameUseCase
 *
 * 게임을 삭제합니다.
 * 주로 보상 트랜잭션에서 사용됩니다.
 */
export class DeleteGameUseCase implements IUseCase<DeleteGameRequest, UseCaseResponse<DeleteGameResponse>> {
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: DeleteGameRequest): Promise<UseCaseResponse<DeleteGameResponse>> {
    try {
      // 1. Value Object 변환 및 검증
      let roomId: RoomId;

      try {
        roomId = RoomId.from(request.roomId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid room ID format',
          'roomId'
        );
      }

      // 2. Repository를 통해 삭제
      try {
        await this.gameRepository.delete(roomId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new ResourceNotFoundError('Game', roomId.value);
        }
        throw error;
      }

      // 3. Response DTO 반환
      return createSuccessResponse<DeleteGameResponse>({
        roomId: roomId.value,
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
        'DELETE_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
