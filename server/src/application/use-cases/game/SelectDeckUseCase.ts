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
import { UseCaseResponse, createSuccessResponse, createErrorResponse } from '../../dto/common/BaseResponse';
import { ResourceNotFoundError, ValidationError, BusinessRuleError } from '../../errors/ApplicationError';

/**
 * SelectDeckUseCase
 *
 * 플레이어가 카드 덱을 선택합니다.
 */
export class SelectDeckUseCase implements IUseCase<SelectDeckRequest, UseCaseResponse<SelectDeckResponse>> {
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

      // 3. 도메인 로직 실행
      try {
        game.selectDeck(playerId, request.deckIndex);
      } catch (error) {
        // 도메인 에러를 비즈니스 규칙 에러로 변환
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to select deck'
        );
      }

      // 선택된 덱의 카드 정보 가져오기
      const selectedDeck = game.selectableDecks?.[request.deckIndex];
      if (!selectedDeck || !selectedDeck.cards) {
        throw new BusinessRuleError('Selected deck not found');
      }

      const selectedCards = selectedDeck.cards.map((card: any) => ({
        rank: card.rank,
        isJoker: card.isJoker,
      }));

      // 4. 변경사항 영속화
      await this.gameRepository.update(roomId, game);

      // 5. Response DTO 반환
      return createSuccessResponse<SelectDeckResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        selectedCards,
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

      if (error instanceof ResourceNotFoundError) {
        return createErrorResponse(
          error.code,
          error.message
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
        'SELECT_DECK_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
