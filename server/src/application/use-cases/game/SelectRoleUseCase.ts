/**
 * SelectRoleUseCase.ts
 *
 * 역할 선택 유스케이스
 *
 * 책임:
 * 1. RoomId, PlayerId Value Object 변환
 * 2. Game Entity 조회
 * 3. 역할 선택 도메인 로직 실행 (game.selectRole)
 * 4. Repository를 통한 업데이트
 * 5. Response DTO 반환
 */

import { IUseCase } from '../base/IUseCase';
import { IGameRepository } from '../../ports/IGameRepository';
import { RoomId } from '../../../domain/value-objects/RoomId';
import { PlayerId } from '../../../domain/value-objects/PlayerId';
import { SelectRoleRequest, SelectRoleResponse } from '../../dto/game/SelectRoleDto';
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
 * SelectRoleUseCase
 *
 * 플레이어가 역할을 선택합니다.
 */
export class SelectRoleUseCase
  implements IUseCase<SelectRoleRequest, UseCaseResponse<SelectRoleResponse>>
{
  constructor(private readonly gameRepository: IGameRepository) {}

  async execute(request: SelectRoleRequest): Promise<UseCaseResponse<SelectRoleResponse>> {
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

      // roleNumber 검증
      if (
        typeof request.roleNumber !== 'number' ||
        request.roleNumber < 1 ||
        request.roleNumber > 13
      ) {
        throw new ValidationError('Role number must be between 1 and 13', 'roleNumber');
      }

      // 2. Game Entity 조회
      const game = await this.gameRepository.findById(roomId);
      if (!game) {
        throw new ResourceNotFoundError('Game', roomId.value);
      }

      // 3. 도메인 로직 실행
      let allRolesSelected: boolean;
      try {
        allRolesSelected = game.selectRole(playerId, request.roleNumber);
      } catch (error) {
        // 도메인 에러를 BusinessRuleError로 변환
        throw new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to select role',
          'SELECT_ROLE_FAILED'
        );
      }

      // 4. 모든 역할 선택 완료 시 자동으로 다음 단계 진행
      if (allRolesSelected) {
        // 4-1. 역할에 따라 rank 할당 (role이 작을수록 rank도 작음 = 높은 순위)
        const sortedPlayers = game.players.slice().sort((a, b) => (a.role ?? 0) - (b.role ?? 0));
        sortedPlayers.forEach((player, index) => {
          player.assignRank(index + 1);
        });

        // 4-2. 덱 분할 및 선택 가능한 덱 생성
        const selectableDecks = DeckService.createSelectableDecks(
          game.deck!,
          game.players.length
        );
        game.setSelectableDecks(selectableDecks);

        // 4-3. Phase를 cardSelection으로 변경
        game.changePhase('cardSelection');

        // 4-4. 첫 번째 플레이어(rank 1)의 턴으로 설정
        game.setCurrentTurn(sortedPlayers[0].id);
      }

      // 5. Repository를 통해 업데이트
      try {
        await this.gameRepository.update(roomId, game);
      } catch {
        throw new BusinessRuleError('Failed to update game state', 'UPDATE_GAME_FAILED');
      }

      // 5. Response DTO 반환
      return createSuccessResponse<SelectRoleResponse>({
        roomId: game.roomId.value,
        playerId: playerId.value,
        selectedRole: request.roleNumber,
        allRolesSelected,
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
        'SELECT_ROLE_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
