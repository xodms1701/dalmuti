/**
 * SelectDeckUseCase.ts
 *
 * 덱 선택 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId를 Value Object로 변환
 * 2. Game Repository에서 게임 조회
 * 3. 도메인 로직(Game.selectDeck) 실행
 * 4. 변경사항 영속화
 * 5. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { SelectDeckRequest, SelectDeckResponse } from '../../dto/game/SelectDeckDto';
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
 * SelectDeckUseCase
 *
 * 플레이어가 카드 덱을 선택합니다.
 */
export class SelectDeckUseCase
  implements IUseCase<SelectDeckRequest, UseCaseResponse<SelectDeckResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: SelectDeckRequest): Promise<UseCaseResponse<SelectDeckResponse>> {
    try {
      // 1. Value Object로 변환
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

      // deckIndex 유효성 검증
      if (typeof request.deckIndex !== 'number' || request.deckIndex < 0) {
        throw new ValidationError('Deck index must be a non-negative number', 'deckIndex');
      }

      // 2. Game Repository에서 게임 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 도메인 로직 실행 - 선택된 덱 반환
      let selectedDeck;
      try {
        selectedDeck = game.selectDeck(playerId, request.deckIndex);
      } catch (error) {
        // 도메인 에러를 비즈니스 규칙 에러로 변환
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to select deck'
        );
      }

      // 선택된 덱의 카드 정보 변환
      const selectedCards = selectedDeck.cards.map((card) => card.toPlainObject());

      // 4. 마지막 덱 자동 선택 로직 (다음 플레이어에게 턴 넘기기 전에 처리)
      const sortedPlayers = game.players.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      const remainingDecks = game.selectableDecks?.filter((deck) => !deck.isSelected) ?? [];

      // 다음 플레이어 찾기
      const currentPlayerIndex = sortedPlayers.findIndex((p) => p.id.equals(playerId));
      const nextPlayerIndex = (currentPlayerIndex + 1) % sortedPlayers.length;
      const nextPlayer = sortedPlayers[nextPlayerIndex];

      if (remainingDecks.length === 1) {
        // 남은 덱이 1개면 다음 플레이어에게 자동 할당
        const lastDeck = remainingDecks[0];
        lastDeck.isSelected = true;
        lastDeck.selectedBy = nextPlayer.id.value;

        // 다음 플레이어에게 카드 할당
        nextPlayer.addCards(lastDeck.cards);

        // 모든 덱이 선택되었으므로 1등(rank가 가장 낮은 플레이어)으로 턴 설정
        game.setCurrentTurn(sortedPlayers[0].id);
      } else if (remainingDecks.length > 1) {
        // 남은 덱이 2개 이상이면 다음 플레이어로 턴 넘기기
        game.setCurrentTurn(nextPlayer.id);
      }

      // 5. 모든 덱이 선택되었는지 확인 (마지막 덱 자동 할당 포함)
      const allDecksSelected = game.selectableDecks?.every((deck) => deck.isSelected) ?? false;

      if (allDecksSelected) {
        // 조커 2장 보유자 확인
        const doubleJokerPlayer = game.checkDoubleJoker();

        if (doubleJokerPlayer) {
          // 조커 2장 보유자가 있으면 혁명 선택 페이즈로
          game.changePhase('revolution');
          game.setCurrentTurn(doubleJokerPlayer.id);
        } else {
          // 조커 2장 보유자가 없으면 바로 세금 교환
          const taxExchanges = TaxService.initializeTaxExchanges(game.players);
          game.prepareForTaxPhase(taxExchanges);
        }
      }

      // 6. 변경사항 영속화
      await this.gameRepository.update(roomId, game);

      // 7. Response DTO 반환
      return createSuccessResponse<SelectDeckResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        selectedCards,
        phase: game.phase,
      });
    } catch (error) {
      // Application Layer 에러는 그대로 전달
      if (error instanceof ValidationError) {
        return createErrorResponse(error.code, error.message, { field: error.field });
      }

      if (error instanceof ResourceNotFoundError) {
        return createErrorResponse(error.code, error.message);
      }

      if (error instanceof BusinessRuleError) {
        return createErrorResponse(error.code, error.message);
      }

      // 예상치 못한 에러
      return createErrorResponse(
        'SELECT_DECK_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
