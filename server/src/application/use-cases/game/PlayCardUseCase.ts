/**
 * PlayCardUseCase.ts
 *
 * 카드 플레이 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId 검증
 * 2. 게임 조회 및 검증
 * 3. 카드 플레이 검증 (ValidationService)
 * 4. 플레이어 카드 플레이 (Game Entity)
 * 5. 다음 턴 계산 (TurnService)
 * 6. 라운드 종료 확인
 * 7. Repository를 통한 영속화
 * 8. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { Card } from '../../../domain/entities/Card';
import { PlayCardRequest, PlayCardResponse } from '../../dto/game/PlayCardDto';
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
import * as ValidationService from '../../../domain/services/ValidationService';
import * as TurnService from '../../../domain/services/TurnService';

/**
 * PlayCardUseCase
 *
 * 플레이어가 카드를 플레이합니다.
 */
export class PlayCardUseCase
  implements IUseCase<PlayCardRequest, UseCaseResponse<PlayCardResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: PlayCardRequest): Promise<UseCaseResponse<PlayCardResponse>> {
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

      // 2. 게임 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 카드 배열을 Card Entity로 변환
      let cards: Card[];
      try {
        cards = request.cards.map((c) => Card.create(c.rank, c.isJoker));
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Invalid card format',
          'cards'
        );
      }

      // 4. 게임 상태 검증 (playing 페이즈여야 함)
      const gameStateValidation = ValidationService.validateGameState(game, 'playing');
      if (!gameStateValidation.success) {
        throw new BusinessRuleError(
          gameStateValidation.error || 'Invalid game state',
          'INVALID_GAME_STATE'
        );
      }

      // 5. 플레이어 액션 검증 (턴, 패스 상태 등)
      const playerActionValidation = ValidationService.validatePlayerAction(game, playerId.value);
      if (!playerActionValidation.success) {
        throw new BusinessRuleError(
          playerActionValidation.error || 'Invalid player action',
          'INVALID_PLAYER_ACTION'
        );
      }

      // 6. 플레이어가 카드를 보유하는지 검증
      const hasCardsValidation = ValidationService.validatePlayerHasCards(game, playerId, cards);
      if (!hasCardsValidation.success) {
        throw new BusinessRuleError(
          hasCardsValidation.error || 'Player does not have cards',
          'PLAYER_DOES_NOT_HAVE_CARDS'
        );
      }

      // 7. 카드 유효성 검증 (같은 숫자인지, lastPlay보다 강한지 등)
      const lastPlayPlain = game.lastPlay
        ? {
            playerId: game.lastPlay.playerId.value,
            cards: game.lastPlay.cards,
          }
        : undefined;

      const cardsValidation = ValidationService.validateCards(
        cards.map((c) => c.toPlainObject()),
        lastPlayPlain
      );
      if (!cardsValidation.success) {
        throw new BusinessRuleError(cardsValidation.error || 'Invalid cards', 'INVALID_CARDS');
      }

      // 8. 플레이어 카드 플레이
      const player = game.getPlayer(playerId);
      if (!player) {
        throw new ResourceNotFoundError('Player', playerId.value);
      }

      player.playCards(cards);

      // 9. lastPlay 업데이트
      game.setLastPlay({
        playerId,
        cards,
      });

      // 10. 플레이어가 모든 카드를 냈으면 완료 목록에 추가
      if (player.hasFinished()) {
        game.addFinishedPlayer(playerId);
      }

      // 11. 다음 턴 계산
      const nextPlayerId = TurnService.findNextPlayer(game, playerId.value);

      // 12. 라운드 완료 확인 (마지막 플레이어를 제외한 모든 플레이어가 패스했는지)
      const roundFinished = TurnService.allPlayersPassedExceptLast(game);

      // 13. 라운드가 완료되면 새로운 라운드 시작
      if (roundFinished) {
        TurnService.startNewRound(game);
      } else if (nextPlayerId) {
        // 다음 턴 설정
        game.setCurrentTurn(PlayerId.create(nextPlayerId));
      } else {
        // 다음 플레이어가 없으면 게임 종료
        game.setCurrentTurn(null);
      }

      // 14. Repository를 통해 업데이트
      await this.gameRepository.update(roomId, game);

      // 15. Response DTO 반환
      return createSuccessResponse<PlayCardResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        playedCards: cards.map((c) => c.toPlainObject()),
        nextTurn: game.currentTurn ? game.currentTurn.value : null,
        roundFinished,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (
        error instanceof ValidationError ||
        error instanceof BusinessRuleError ||
        error instanceof ResourceNotFoundError
      ) {
        return createErrorResponse(
          error.code,
          error.message,
          error instanceof ValidationError ? { field: error.field } : undefined
        );
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'PLAY_CARD_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
