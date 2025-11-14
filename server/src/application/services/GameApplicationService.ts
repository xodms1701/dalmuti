/**
 * GameApplicationService.ts
 *
 * Application Service - Use Case 오케스트레이션
 *
 * 여러 Use Case를 조합하여 복잡한 비즈니스 플로우를 처리합니다.
 * 향후 트랜잭션 관리, 이벤트 발행 등을 담당할 수 있습니다.
 */

import { CreateGameUseCase } from '../use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from '../use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from '../use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from '../use-cases/game/ReadyGameUseCase';
import { SelectRoleUseCase } from '../use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from '../use-cases/game/SelectDeckUseCase';
import { PlayCardUseCase } from '../use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from '../use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from '../use-cases/game/VoteNextGameUseCase';
import { UseCaseResponse, createSuccessResponse, createErrorResponse } from '../dto/common/BaseResponse';
import { IGameRepository } from '../ports/IGameRepository';
import { RoomId } from '../../domain/value-objects/RoomId';

/**
 * GameApplicationService
 *
 * Use Case들을 조합하여 복잡한 비즈니스 시나리오를 처리합니다.
 * 트랜잭션 관리 및 보상 트랜잭션을 담당합니다.
 */
export class GameApplicationService {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly joinGameUseCase: JoinGameUseCase,
    private readonly leaveGameUseCase: LeaveGameUseCase,
    private readonly readyGameUseCase: ReadyGameUseCase,
    private readonly selectRoleUseCase: SelectRoleUseCase,
    private readonly selectDeckUseCase: SelectDeckUseCase,
    private readonly playCardUseCase: PlayCardUseCase,
    private readonly passTurnUseCase: PassTurnUseCase,
    private readonly voteNextGameUseCase: VoteNextGameUseCase
  ) {}

  /**
   * 게임 생성 및 생성자 자동 참가
   *
   * 게임을 생성하고 생성자를 자동으로 게임에 참가시킵니다.
   *
   * @param creatorId - 생성자 플레이어 ID
   * @param nickname - 생성자 닉네임
   * @param roomId - 방 ID (선택사항, 지정하지 않으면 자동 생성)
   * @returns 생성된 게임 정보 및 플레이어 정보
   */
  async createAndJoinGame(
    creatorId: string,
    nickname: string,
    roomId?: string
  ): Promise<
    UseCaseResponse<{
      roomId: string;
      playerId: string;
      playerCount: number;
    }>
  > {
    try {
      // 1. 게임 생성
      const createResult = await this.createGameUseCase.execute({ roomId });

      if (!createResult.success) {
        return createResult;
      }

      // 2. 생성자를 게임에 자동 참가
      const joinResult = await this.joinGameUseCase.execute({
        roomId: createResult.data.roomId,
        playerId: creatorId,
        nickname,
      });

      if (!joinResult.success) {
        // 보상 트랜잭션: 참가 실패 시 생성된 게임을 삭제하여 원자성 보장
        try {
          await this.gameRepository.delete(RoomId.from(createResult.data.roomId));
        } catch (deleteError) {
          // 삭제 실패 시 로그만 남기고 원래 에러를 반환
          // 실제 운영 환경에서는 모니터링/알림 필요
          console.error(
            `Failed to rollback game creation: ${createResult.data.roomId}`,
            deleteError
          );
        }
        return joinResult;
      }

      // 3. 성공 응답 반환
      return createSuccessResponse({
        roomId: createResult.data.roomId,
        playerId: creatorId,
        playerCount: joinResult.data.playerCount,
      });
    } catch (error) {
      return createErrorResponse(
        'CREATE_AND_JOIN_GAME_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * 모든 플레이어가 준비 완료되었는지 확인하고 다음 페이즈로 진행
   *
   * 플레이어가 준비 상태를 변경하고, 모든 플레이어가 준비되었으면
   * 자동으로 역할 선택 페이즈로 진행할 수 있습니다.
   * (현재는 준비 상태만 변경하고, 페이즈 전환은 별도 로직에서 처리)
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param isReady - 준비 상태
   * @returns 준비 상태 변경 결과
   */
  async toggleReadyAndCheckStart(
    roomId: string,
    playerId: string,
    isReady: boolean
  ): Promise<
    UseCaseResponse<{
      roomId: string;
      playerId: string;
      isReady: boolean;
      allPlayersReady: boolean;
      canStartGame: boolean;
    }>
  > {
    try {
      // 준비 상태 변경
      const readyResult = await this.readyGameUseCase.execute({
        roomId,
        playerId,
        isReady,
      });

      if (!readyResult.success) {
        return readyResult;
      }

      // 게임 시작 가능 여부 판단
      // (최소 4명 이상 & 모든 플레이어 준비 완료)
      const MIN_PLAYERS = 4;
      const canStartGame =
        readyResult.data.playerCount >= MIN_PLAYERS &&
        readyResult.data.allPlayersReady;

      return createSuccessResponse({
        ...readyResult.data,
        canStartGame,
      });
    } catch (error) {
      return createErrorResponse(
        'TOGGLE_READY_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * 카드 플레이 또는 패스 처리
   *
   * 플레이어가 카드를 내거나 패스할 수 있도록 통합 인터페이스를 제공합니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param cards - 낼 카드 (빈 배열이면 패스로 처리)
   * @returns 플레이 결과
   */
  async playOrPass(
    roomId: string,
    playerId: string,
    cards: Array<{ rank: number; isJoker: boolean }>
  ): Promise<
    UseCaseResponse<{
      roomId: string;
      playerId: string;
      action: 'play' | 'pass';
      playedCards?: Array<{ rank: number; isJoker: boolean }>;
      nextTurn: string | null;
      roundFinished?: boolean;
      allPlayersPassed?: boolean;
    }>
  > {
    try {
      // 카드가 없으면 패스
      if (!cards || cards.length === 0) {
        const passResult = await this.passTurnUseCase.execute({
          roomId,
          playerId,
        });

        if (!passResult.success) {
          return passResult;
        }

        return createSuccessResponse({
          roomId: passResult.data.roomId,
          playerId: passResult.data.playerId,
          action: 'pass' as const,
          nextTurn: passResult.data.nextTurn,
          allPlayersPassed: passResult.data.allPlayersPassed,
        });
      }

      // 카드 플레이
      const playResult = await this.playCardUseCase.execute({
        roomId,
        playerId,
        cards,
      });

      if (!playResult.success) {
        return playResult;
      }

      return createSuccessResponse({
        roomId: playResult.data.roomId,
        playerId: playResult.data.playerId,
        action: 'play' as const,
        playedCards: playResult.data.playedCards,
        nextTurn: playResult.data.nextTurn,
        roundFinished: playResult.data.roundFinished,
      });
    } catch (error) {
      return createErrorResponse(
        'PLAY_OR_PASS_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
