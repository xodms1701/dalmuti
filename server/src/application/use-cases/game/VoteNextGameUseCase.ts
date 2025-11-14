/**
 * VoteNextGameUseCase.ts
 *
 * 다음 게임 투표 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId를 Value Object로 변환
 * 2. Game Repository에서 게임 조회
 * 3. 도메인 로직(Game.registerVote) 실행
 * 4. 투표 결과 확인 및 게임 상태 변경 (다음 게임 시작 또는 게임 종료)
 * 5. 변경사항 영속화
 * 6. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { VoteNextGameRequest, VoteNextGameResponse } from '../../dto/game/VoteNextGameDto';
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
 * VoteNextGameUseCase
 *
 * 게임 종료 후 다음 게임 진행 여부에 대한 투표를 처리합니다.
 * 모든 플레이어가 찬성하면 다음 게임이 시작되고,
 * 한 명이라도 반대하면 게임이 종료됩니다.
 */
export class VoteNextGameUseCase
  implements IUseCase<VoteNextGameRequest, UseCaseResponse<VoteNextGameResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: VoteNextGameRequest): Promise<UseCaseResponse<VoteNextGameResponse>> {
    try {
      // 1. RoomId, PlayerId를 Value Object로 변환
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

      // 3. 도메인 로직 실행 - 투표 등록
      try {
        game.registerVote(playerId, request.vote);
      } catch (error) {
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to register vote'
        );
      }

      // 4. 투표 결과 확인
      const voteResult = game.getVoteResult();

      let votePassed = false;
      let nextGameStarted = false;

      // 5. 투표 결과에 따른 처리
      if (voteResult.allVoted) {
        if (voteResult.approved) {
          // 모든 플레이어가 찬성 - 다음 게임 시작
          game.startNextGame();
          votePassed = true;
          nextGameStarted = true;
        } else {
          // 한 명이라도 반대 - 게임 종료
          game.endGame();
          votePassed = false;
          nextGameStarted = false;
        }
      }

      // 6. Repository를 통해 업데이트
      await this.gameRepository.update(game.roomId, game);

      // 7. Response DTO 반환
      return createSuccessResponse<VoteNextGameResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        votePassed,
        nextGameStarted,
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

      if (error instanceof BusinessRuleError) {
        return createErrorResponse(error.code, error.message);
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'VOTE_NEXT_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
