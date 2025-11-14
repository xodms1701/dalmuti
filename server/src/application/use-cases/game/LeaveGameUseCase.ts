/**
 * LeaveGameUseCase.ts
 *
 * 게임 나가기 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId 검증 및 Value Object 변환
 * 2. 게임 조회
 * 3. 플레이어 제거
 * 4. 게임 상태 업데이트 또는 삭제
 * 5. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { LeaveGameRequest, LeaveGameResponse } from '../../dto/game/LeaveGameDto';
import { UseCaseResponse, createSuccessResponse, createErrorResponse } from '../../dto/common/BaseResponse';
import { NotFoundError } from '../../ports/RepositoryError';
import { ResourceNotFoundError, ValidationError, BusinessRuleError } from '../../errors/ApplicationError';

/**
 * LeaveGameUseCase
 *
 * 플레이어가 게임에서 나갑니다.
 * 마지막 플레이어가 나가면 게임이 삭제됩니다.
 */
export class LeaveGameUseCase implements IUseCase<LeaveGameRequest, UseCaseResponse<LeaveGameResponse>> {
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: LeaveGameRequest): Promise<UseCaseResponse<LeaveGameResponse>> {
    try {
      // 1. Value Object 변환 및 검증
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

      // 2. 게임 조회
      let game;
      try {
        game = await this.gameRepository.findById(roomId);
        if (!game) {
          throw new ResourceNotFoundError('Game', roomId.value);
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new ResourceNotFoundError('Game', roomId.value);
        }
        if (error instanceof ResourceNotFoundError) {
          throw error;
        }
        throw error;
      }

      // 3. 플레이어 제거
      try {
        game.removePlayer(playerId);
      } catch (error) {
        // 도메인 에러를 비즈니스 규칙 에러로 변환
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to remove player',
          'PLAYER_REMOVAL_FAILED'
        );
      }

      // 4. 게임 상태 업데이트 또는 삭제
      const remainingPlayers = game.players.length;
      let gameDeleted = false;

      if (remainingPlayers === 0) {
        // 마지막 플레이어가 나간 경우 게임 삭제
        await this.gameRepository.delete(roomId);
        gameDeleted = true;
      } else {
        // 게임 상태 업데이트
        await this.gameRepository.update(roomId, game);
      }

      // 5. Response DTO 반환
      return createSuccessResponse<LeaveGameResponse>({
        roomId: roomId.value,
        remainingPlayers,
        gameDeleted,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError) {
        return createErrorResponse(
          error.code,
          error.message,
          { field: error.field }
        );
      }

      if (error instanceof ResourceNotFoundError || error instanceof BusinessRuleError) {
        return createErrorResponse(
          error.code,
          error.message
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'LEAVE_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
