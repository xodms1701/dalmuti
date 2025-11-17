/**
 * GameCommandService.ts
 *
 * CQRS Pattern - Command Service
 *
 * 게임 상태 변경(Command) 전담 서비스
 * 여러 Use Case를 조합하여 복잡한 비즈니스 플로우를 처리합니다.
 * 향후 트랜잭션 관리, 이벤트 발행 등을 담당할 수 있습니다.
 *
 * 조회(Query)는 GameQueryService를 사용하세요.
 */

import { CreateGameUseCase } from '../use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from '../use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from '../use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from '../use-cases/game/ReadyGameUseCase';
import { StartGameUseCase } from '../use-cases/game/StartGameUseCase';
import { SelectRoleUseCase } from '../use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from '../use-cases/game/SelectDeckUseCase';
import { SelectRevolutionUseCase } from '../use-cases/game/SelectRevolutionUseCase';
import { PlayCardUseCase } from '../use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from '../use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from '../use-cases/game/VoteNextGameUseCase';
import { DeleteGameUseCase } from '../use-cases/game/DeleteGameUseCase';
import {
  UseCaseResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../dto/common/BaseResponse';

/**
 * GameCommandService
 *
 * Use Case들을 조합하여 복잡한 비즈니스 시나리오를 처리합니다.
 * 트랜잭션 관리 및 보상 트랜잭션을 담당합니다.
 */
export class GameCommandService {
  constructor(
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly joinGameUseCase: JoinGameUseCase,
    private readonly leaveGameUseCase: LeaveGameUseCase,
    private readonly readyGameUseCase: ReadyGameUseCase,
    private readonly startGameUseCase: StartGameUseCase,
    private readonly selectRoleUseCase: SelectRoleUseCase,
    private readonly selectDeckUseCase: SelectDeckUseCase,
    private readonly selectRevolutionUseCase: SelectRevolutionUseCase,
    private readonly playCardUseCase: PlayCardUseCase,
    private readonly passTurnUseCase: PassTurnUseCase,
    private readonly voteNextGameUseCase: VoteNextGameUseCase,
    private readonly deleteGameUseCase: DeleteGameUseCase
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
      // 1. 게임 생성 (생성자를 방장으로 설정)
      const createResult = await this.createGameUseCase.execute({
        roomId,
        ownerId: creatorId,
      });

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
        const deleteResult = await this.deleteGameUseCase.execute({
          roomId: createResult.data.roomId,
        });

        if (!deleteResult.success) {
          // 삭제 실패 시 로그만 남기고 원래 에러를 반환
          // 실제 운영 환경에서는 모니터링/알림 필요
          console.error(
            `Failed to rollback game creation: ${createResult.data.roomId}`,
            deleteResult.error
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
   * 플레이어의 준비 상태를 토글하고 게임 시작 가능 여부 확인
   *
   * ReadyGameUseCase를 호출하여 준비 상태를 토글합니다:
   * - 준비 안됨 → 준비됨
   * - 준비됨 → 준비 안됨 (취소)
   *
   * 모든 플레이어가 준비되었으면 게임 시작 가능 여부를 반환합니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @returns 준비 상태 변경 결과
   */
  async toggleReadyAndCheckStart(
    roomId: string,
    playerId: string
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
      // 준비 상태 토글 (isReady를 전달하지 않으면 UseCase에서 자동 토글)
      const readyResult = await this.readyGameUseCase.execute({
        roomId,
        playerId,
        // isReady: undefined → ReadyGameUseCase에서 자동 토글
      });

      if (!readyResult.success) {
        return readyResult;
      }

      // 게임 시작 가능 여부 판단
      // (최소 4명 이상 & 모든 플레이어 준비 완료)
      const MIN_PLAYERS = 4;
      const canStartGame =
        readyResult.data.playerCount >= MIN_PLAYERS && readyResult.data.allPlayersReady;

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

  /**
   * 게임 참가
   *
   * 플레이어를 기존 게임에 참가시킵니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param nickname - 플레이어 닉네임
   * @returns 참가 결과
   */
  async joinGame(roomId: string, playerId: string, nickname: string) {
    return this.joinGameUseCase.execute({
      roomId,
      playerId,
      nickname,
    });
  }

  /**
   * 게임 나가기
   *
   * 플레이어를 게임에서 퇴장시킵니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @returns 퇴장 결과
   */
  async leaveGame(roomId: string, playerId: string) {
    return this.leaveGameUseCase.execute({
      roomId,
      playerId,
    });
  }

  /**
   * 게임 시작
   *
   * 대기 중인 게임을 시작하여 역할 선택 단계로 진입합니다.
   * 방장만 게임을 시작할 수 있습니다.
   * - 플레이어 수 검증 (4-8명)
   * - 덱 및 역할 선택 카드 초기화
   * - phase를 'roleSelection'으로 변경
   *
   * @param roomId - 방 ID
   * @param playerId - 게임 시작을 요청한 플레이어 ID (방장)
   * @returns 게임 시작 결과
   */
  async startGame(roomId: string, playerId: string) {
    return this.startGameUseCase.execute({
      roomId,
      playerId,
    });
  }

  /**
   * 역할 선택
   *
   * 플레이어가 역할(순위)을 선택합니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param roleNumber - 역할 번호 (1-13)
   * @returns 역할 선택 결과
   */
  async selectRole(roomId: string, playerId: string, roleNumber: number) {
    return this.selectRoleUseCase.execute({
      roomId,
      playerId,
      roleNumber,
    });
  }

  /**
   * 덱 선택
   *
   * 플레이어가 카드 덱을 선택합니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param deckIndex - 덱 인덱스
   * @returns 덱 선택 결과
   */
  async selectDeck(roomId: string, playerId: string, deckIndex: number) {
    return this.selectDeckUseCase.execute({
      roomId,
      playerId,
      deckIndex,
    });
  }

  /**
   * 혁명 선택
   *
   * 조커 2장 보유 플레이어가 혁명 여부를 선택합니다.
   * - 혁명 선택 시: 대혁명(꼴찌면 순위 반전) 또는 일반혁명 → playing 페이즈
   * - 혁명 거부 시: 세금 교환 → tax 페이즈
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param wantRevolution - 혁명 여부 (true: 혁명, false: 거부)
   * @returns 혁명 선택 결과
   */
  async selectRevolution(roomId: string, playerId: string, wantRevolution: boolean) {
    return this.selectRevolutionUseCase.execute({
      roomId,
      playerId,
      wantRevolution,
    });
  }

  /**
   * 다음 게임 투표
   *
   * 게임 종료 후 다음 게임 진행 여부에 투표합니다.
   *
   * @param roomId - 방 ID
   * @param playerId - 플레이어 ID
   * @param vote - 투표 (true: 찬성, false: 반대)
   * @returns 투표 결과
   */
  async voteNextGame(roomId: string, playerId: string, vote: boolean) {
    return this.voteNextGameUseCase.execute({
      roomId,
      playerId,
      vote,
    });
  }
}
