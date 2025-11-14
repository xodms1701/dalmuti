/**
 * JoinGameUseCase.ts
 *
 * 게임 참가 유스케이스
 *
 * 책임:
 * 1. RoomId 및 PlayerId 검증
 * 2. 게임 조회
 * 3. Player Entity 생성
 * 4. 게임에 플레이어 추가 (도메인 로직)
 * 5. Repository를 통한 영속화
 * 6. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { Player } from '../../../domain/entities/Player';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { JoinGameRequest, JoinGameResponse } from '../../dto/game/JoinGameDto';
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

/**
 * JoinGameUseCase
 *
 * 플레이어가 기존 게임에 참가합니다.
 */
export class JoinGameUseCase
  implements IUseCase<JoinGameRequest, UseCaseResponse<JoinGameResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: JoinGameRequest): Promise<UseCaseResponse<JoinGameResponse>> {
    try {
      // 1. RoomId 검증
      let roomId: RoomId;
      try {
        roomId = RoomId.from(request.roomId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid room ID format',
          'roomId'
        );
      }

      // 2. PlayerId 생성 및 검증
      let playerId: PlayerId;
      try {
        playerId = PlayerId.create(request.playerId);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid player ID format',
          'playerId'
        );
      }

      // 3. 게임 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 4. Player Entity 생성
      let player: Player;
      try {
        player = Player.create(playerId, request.nickname);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid player data',
          'nickname'
        );
      }

      // 5. 게임에 플레이어 추가 (도메인 로직)
      try {
        game.addPlayer(player);
      } catch (error) {
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to add player to game',
          'ADD_PLAYER_FAILED'
        );
      }

      // 6. Repository를 통해 영속화
      await this.gameRepository.update(game.roomId, game);

      // 7. Response DTO 반환
      return createSuccessResponse<JoinGameResponse>({
        roomId: game.roomId.value,
        playerId: player.id.value,
        playerCount: game.players.length,
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
        'JOIN_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
