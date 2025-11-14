/**
 * VoteNextGameUseCase.ts
 *
 * 다음 게임 투표 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId를 Value Object로 변환
 * 2. Game Entity 조회
 * 3. 투표 처리 및 결과 확인
 * 4. 투표 결과에 따른 게임 상태 변경 (다음 게임 시작 또는 게임 종료)
 * 5. Repository를 통한 영속화
 * 6. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { VoteNextGameRequest, VoteNextGameResponse } from '../../dto/game/VoteNextGameDto';
import { UseCaseResponse, createSuccessResponse, createErrorResponse } from '../../dto/common/BaseResponse';
import { NotFoundError } from '../../ports/RepositoryError';
import { ResourceNotFoundError, ValidationError, BusinessRuleError } from '../../errors/ApplicationError';

/**
 * VoteNextGameUseCase
 *
 * 게임 종료 후 다음 게임 진행 여부에 대한 투표를 처리합니다.
 * 모든 플레이어가 찬성하면 다음 게임이 시작되고,
 * 한 명이라도 반대하면 게임이 종료됩니다.
 */
export class VoteNextGameUseCase implements IUseCase<VoteNextGameRequest, UseCaseResponse<VoteNextGameResponse>> {
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
      let game;
      try {
        game = await this.gameRepository.findById(roomId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new ResourceNotFoundError('Game', roomId.value);
        }
        throw error;
      }

      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 플레이어 존재 확인
      const player = game.getPlayer(playerId);
      if (!player) {
        throw new ResourceNotFoundError('Player', playerId.value);
      }

      // 4. 투표 처리
      // Game 엔티티에 vote 메서드가 없으므로 Use Case에서 투표 추적
      // 투표 상태를 플레이어의 isReady 필드를 활용하여 추적
      // (간단한 구현: 찬성 = ready(), 반대 = unready())

      if (request.vote) {
        player.ready(); // 찬성
      } else {
        player.unready(); // 반대
      }

      // 5. 모든 플레이어의 투표 확인
      const allPlayers = game.players;
      const totalPlayers = allPlayers.length;
      const votedPlayers = allPlayers.filter(p => p.isReady).length;
      const rejectedPlayers = allPlayers.filter(p => !p.isReady).length;

      let votePassed = false;
      let nextGameStarted = false;

      // 6. 투표 결과에 따른 처리
      // 한 명이라도 반대했고 모든 플레이어가 투표했으면 게임 종료
      if (rejectedPlayers > 0 && (votedPlayers + rejectedPlayers) === totalPlayers) {
        game.changePhase('gameEnd');
        votePassed = false;
        nextGameStarted = false;
      }
      // 모든 플레이어가 찬성했으면 다음 게임 시작
      else if (votedPlayers === totalPlayers && totalPlayers > 0) {
        // 다음 게임 시작 로직
        // 라운드 증가, 페이즈 변경, 플레이어 상태 초기화 등
        game.incrementRound();
        game.changePhase('roleSelection');

        // 플레이어 상태 초기화
        allPlayers.forEach(p => {
          p.unready();
          p.resetPass();
        });

        votePassed = true;
        nextGameStarted = true;
      }

      // 7. Repository를 통해 업데이트
      await this.gameRepository.update(game.roomId, game);

      // 8. Response DTO 반환
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
        return createErrorResponse(
          error.code,
          error.message
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'VOTE_NEXT_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
