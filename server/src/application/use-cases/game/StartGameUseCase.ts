/**
 * StartGameUseCase.ts
 *
 * 게임 시작 유스케이스
 *
 * 책임:
 * 1. RoomId Value Object 변환
 * 2. Game Entity 조회
 * 3. 플레이어 수 검증 (MIN_PLAYERS ~ MAX_PLAYERS)
 * 4. 덱 및 역할 선택 카드 초기화
 * 5. phase를 'roleSelection'으로 변경
 * 6. Repository를 통한 업데이트
 * 7. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { StartGameRequest, StartGameResponse } from '../../dto/game/StartGameDto';
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
import * as DeckService from '../../../domain/services/DeckService';
import { Card } from '../../../domain/entities/Card';

/**
 * StartGameUseCase
 *
 * 대기 중인 게임을 시작하여 역할 선택 단계로 진입합니다.
 */
export class StartGameUseCase
  implements IUseCase<StartGameRequest, UseCaseResponse<StartGameResponse>>
{
  private readonly MIN_PLAYERS = 4;
  private readonly MAX_PLAYERS = 8;

  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: StartGameRequest): Promise<UseCaseResponse<StartGameResponse>> {
    try {
      // 1. Value Object 변환
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

      // 3. 플레이어 수 검증
      const playerCount = game.players.length;
      if (playerCount < this.MIN_PLAYERS || playerCount > this.MAX_PLAYERS) {
        throw new BusinessRuleError(
          `게임을 시작하려면 ${this.MIN_PLAYERS}~${this.MAX_PLAYERS}명의 플레이어가 필요합니다. 현재: ${playerCount}명`
        );
      }

      // 4. phase 검증 (waiting 단계에서만 시작 가능)
      if (game.phase !== 'waiting') {
        throw new BusinessRuleError(
          `대기 중인 게임만 시작할 수 있습니다. 현재 상태: ${game.phase}`
        );
      }

      // 5. 덱 초기화
      const standardDeck = DeckService.initializeDeck();
      const shuffledDeck = DeckService.shuffleDeck(standardDeck);

      // Card Value Object로 변환
      const deckCards = shuffledDeck.map((cardPlain) =>
        Card.create(cardPlain.rank, cardPlain.isJoker)
      );

      game.setDeck(deckCards);

      // 6. 역할 선택 카드 초기화
      const roleSelectionCards = DeckService.createRoleSelectionDeck();
      game.setRoleSelectionCards(roleSelectionCards);

      // 7. phase를 'roleSelection'으로 변경
      game.changePhase('roleSelection');

      // 8. Repository를 통해 업데이트
      await this.gameRepository.update(roomId, game);

      // 9. Response DTO 반환
      return createSuccessResponse<StartGameResponse>({
        roomId: game.roomId.value,
        phase: game.phase,
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
        'START_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
