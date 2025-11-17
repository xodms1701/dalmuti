/**
 * TransitionToCardSelectionUseCase.ts
 *
 * 역할 선택 완료 후 카드 선택 페이즈로 전환하는 유스케이스
 *
 * 책임:
 * 1. RoomId Value Object 변환
 * 2. Game Entity 조회 및 상태 검증
 * 3. 덱 초기화 및 셔플
 * 4. 선택 가능한 덱 생성
 * 5. Phase를 cardSelection으로 변경
 * 6. CurrentTurn을 rank 1 플레이어로 설정
 * 7. Repository를 통한 업데이트
 * 8. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { Card } from '../../../domain/entities/Card';
import {
  TransitionToCardSelectionRequest,
  TransitionToCardSelectionResponse,
} from '../../dto/game/TransitionToCardSelectionDto';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../dto/common/BaseResponse';
import {
  ValidationError,
  BusinessRuleError,
  ResourceNotFoundError,
} from '../../errors/ApplicationError';
import * as DeckService from '../../../domain/services/DeckService';

/**
 * TransitionToCardSelectionUseCase
 *
 * roleSelectionComplete 상태에서 cardSelection 상태로 전환합니다.
 */
export class TransitionToCardSelectionUseCase
  implements
    IUseCase<TransitionToCardSelectionRequest, UseCaseResponse<TransitionToCardSelectionResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(
    request: TransitionToCardSelectionRequest
  ): Promise<UseCaseResponse<TransitionToCardSelectionResponse>> {
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

      // 2. Game Entity 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. Phase 검증 (roleSelectionComplete 상태여야 함)
      let transitioned = false;
      if (game.phase === 'roleSelectionComplete') {
        // 4. 덱 초기화 및 셔플
        const plainDeck = DeckService.initializeDeck();
        let shuffledPlainDeck = DeckService.shuffleDeck(plainDeck);

        // 4.1. 개발 환경에서 테스트를 위한 백도어: 조커 2장을 첫 번째 구간으로 이동
        if (process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_BACKDOOR === 'true') {
          // eslint-disable-next-line no-console
          console.log('[TEST BACKDOOR] Moving 2 jokers to first deck positions');
          shuffledPlainDeck = DeckService.applyTestBackdoor(shuffledPlainDeck);
        }

        // 5. Plain object를 Card 엔티티로 변환
        const newDeck = shuffledPlainDeck.map((card) => Card.fromPlainObject(card));
        game.setDeck(newDeck);

        // 5. 선택 가능한 덱 생성
        const selectableDecks = DeckService.createSelectableDecks(newDeck, game.players.length);
        game.setSelectableDecks(selectableDecks);

        // 6. rank가 낮을수록 높은 순위이므로 오름차순 정렬하여 rank 1 플레이어 찾기
        const rankedPlayers = [...game.players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
        const firstRankPlayer = rankedPlayers[0];

        // 7. Phase를 cardSelection으로 변경하고 currentTurn 설정
        game.changePhase('cardSelection');
        game.setCurrentTurn(firstRankPlayer.id);

        transitioned = true;

        // 8. Repository를 통해 업데이트
        try {
          await this.gameRepository.update(roomId, game);
        } catch {
          throw new BusinessRuleError('Failed to update game state', 'UPDATE_GAME_FAILED');
        }
      }

      // 9. Response DTO 반환
      return createSuccessResponse<TransitionToCardSelectionResponse>({
        roomId: game.roomId.value,
        phase: game.phase,
        transitioned,
        currentTurn: game.currentTurn?.value ?? null,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError) {
        return createErrorResponse(error.code, error.message, { field: error.field });
      }

      if (error instanceof ResourceNotFoundError || error instanceof BusinessRuleError) {
        return createErrorResponse(error.code, error.message);
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'TRANSITION_TO_CARD_SELECTION_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
