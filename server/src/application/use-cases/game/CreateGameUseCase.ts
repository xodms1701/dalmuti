/**
 * CreateGameUseCase.ts
 *
 * 게임 생성 유스케이스
 *
 * 책임:
 * 1. RoomId 생성 또는 검증
 * 2. Game Entity 생성
 * 3. Repository를 통한 영속화
 * 4. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { Game } from '../../../domain/entities/Game';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { CreateGameRequest, CreateGameResponse } from '../../dto/game/CreateGameDto';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../dto/common/BaseResponse';
import { DuplicateError } from '../../ports/RepositoryError';
import { ConflictError, ValidationError } from '../../errors/ApplicationError';

/**
 * CreateGameUseCase
 *
 * 새로운 게임을 생성합니다.
 */
export class CreateGameUseCase
  implements IUseCase<CreateGameRequest, UseCaseResponse<CreateGameResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: CreateGameRequest): Promise<UseCaseResponse<CreateGameResponse>> {
    try {
      // 1. RoomId 생성 또는 검증
      let roomId: RoomId;

      if (request.roomId) {
        // 사용자가 지정한 roomId 검증
        try {
          roomId = RoomId.from(request.roomId);
        } catch (error) {
          throw new ValidationError(
            error instanceof Error ? error.message : 'Invalid room ID format',
            'roomId'
          );
        }
      } else {
        // 자동 생성
        roomId = RoomId.generate();
      }

      // 2. Domain Entity 생성
      const game = Game.create(roomId);

      // 3. Repository를 통해 영속화
      try {
        await this.gameRepository.save(game);
      } catch (error) {
        if (error instanceof DuplicateError) {
          throw new ConflictError(`Game with roomId ${roomId.value} already exists`);
        }
        throw error;
      }

      // 4. Response DTO 반환
      return createSuccessResponse<CreateGameResponse>({
        roomId: game.roomId.value,
        phase: game.phase,
        createdAt: new Date(),
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return createErrorResponse(
          error.code,
          error.message,
          error instanceof ValidationError ? { field: error.field } : undefined
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'CREATE_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
