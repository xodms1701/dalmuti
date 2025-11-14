/**
 * SocketController.ts
 *
 * Presentation Layer - Socket.IO 이벤트 핸들러
 *
 * 책임:
 * 1. Socket.IO 이벤트를 수신하고 Use Cases 호출
 * 2. Use Case 응답을 Socket.IO 클라이언트에게 전달
 * 3. 게임 상태 변경 시 브로드캐스트
 *
 * 의존성 (CQRS Pattern):
 * - GameCommandService (Command): 상태 변경 작업
 * - GameQueryService (Query): 조회 작업
 * - Socket.IO Server: 실시간 통신
 */

import { Server, Socket } from 'socket.io';
import { GameCommandService } from '../../application/services/GameCommandService';
import { GameQueryService } from '../../application/services/GameQueryService';
import { SocketEvent } from '../../../socket/events';
import { UseCaseResponse } from '../../application/dto/common/BaseResponse';

/**
 * Socket.IO 응답 타입
 */
type SocketResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Socket.IO 콜백 타입
 */
type SocketCallback<T = unknown> = (response: SocketResponse<T>) => void;

export class SocketController {
  private io: Server;
  private commandService: GameCommandService;
  private queryService: GameQueryService;
  private playerRooms: Map<string, string>; // playerId → roomId 매핑

  constructor(
    io: Server,
    commandService: GameCommandService,
    queryService: GameQueryService
  ) {
    this.io = io;
    this.commandService = commandService;
    this.queryService = queryService;
    this.playerRooms = new Map();
    this.setupSocketHandlers();
  }

  /**
   * Socket.IO 이벤트 핸들러 설정
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('새로운 클라이언트가 연결되었습니다:', socket.id);

      // TODO: 각 이벤트 핸들러 구현
      this.handleCreateGame(socket);
      this.handleJoinGame(socket);
      this.handleLeaveGame(socket);
      this.handleReady(socket);
      this.handleSelectRole(socket);
      this.handleSelectDeck(socket);
      this.handlePlayCard(socket);
      this.handlePass(socket);
      this.handleVote(socket);
      this.handleGetGameState(socket);

      socket.on('disconnect', async () => {
        console.log('클라이언트가 연결 해제되었습니다:', socket.id);

        // 플레이어가 게임 중이었다면 자동으로 나가기 처리
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          try {
            await this.commandService.leaveGame(roomId, socket.id);
            this.playerRooms.delete(socket.id);
            await this.emitGameState(roomId);
            console.log(`플레이어 ${socket.id}가 게임 ${roomId}에서 자동으로 나갔습니다.`);
          } catch (error) {
            console.error('Disconnect 처리 중 오류:', error);
          }
        }
      });
    });
  }

  /**
   * CREATE_GAME 이벤트 핸들러
   */
  private handleCreateGame(socket: Socket): void {
    socket.on(
      SocketEvent.CREATE_GAME,
      async (
        { nickname }: { nickname: string },
        callback?: SocketCallback
      ) => {
        // Command: 게임 생성 및 참가
        const result = await this.commandService.createAndJoinGame(socket.id, nickname);

        await this.handleSocketEvent(
          result,
          callback,
          result.success ? result.data.roomId : undefined,
          async () => {
            if (result.success) {
              // Socket 룸에 참가
              socket.join(result.data.roomId);
              // 플레이어-룸 매핑 저장
              this.playerRooms.set(socket.id, result.data.roomId);
            }
          }
        );
      }
    );
  }

  /**
   * JOIN_GAME 이벤트 핸들러
   */
  private handleJoinGame(socket: Socket): void {
    socket.on(
      SocketEvent.JOIN_GAME,
      async (
        { roomId, nickname }: { roomId: string; nickname: string },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.joinGame(roomId, socket.id, nickname);

        await this.handleSocketEvent(
          result,
          callback,
          result.success ? roomId : undefined,
          async () => {
            if (result.success) {
              socket.join(roomId);
              this.playerRooms.set(socket.id, roomId);
            }
          }
        );
      }
    );
  }

  /**
   * LEAVE_GAME 이벤트 핸들러
   */
  private handleLeaveGame(socket: Socket): void {
    socket.on(
      SocketEvent.LEAVE_GAME,
      async (
        { roomId }: { roomId: string },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.leaveGame(roomId, socket.id);

        await this.handleSocketEvent(
          result,
          callback,
          result.success ? roomId : undefined,
          async () => {
            if (result.success) {
              socket.leave(roomId);
              this.playerRooms.delete(socket.id);
            }
          }
        );
      }
    );
  }

  /**
   * READY 이벤트 핸들러
   *
   * 플레이어의 준비 상태를 토글합니다:
   * - 준비 안됨 → 준비됨
   * - 준비됨 → 준비 안됨 (취소)
   */
  private handleReady(socket: Socket): void {
    socket.on(
      SocketEvent.READY,
      async (
        { roomId }: { roomId: string },
        callback?: SocketCallback
      ) => {
        // Command: 준비 상태 토글 (현재 상태의 반대로 변경)
        const result = await this.commandService.toggleReadyAndCheckStart(roomId, socket.id);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * SELECT_ROLE 이벤트 핸들러
   */
  private handleSelectRole(socket: Socket): void {
    socket.on(
      SocketEvent.SELECT_ROLE,
      async (
        { roomId, roleNumber }: { roomId: string; roleNumber: number },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.selectRole(roomId, socket.id, roleNumber);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * SELECT_DECK 이벤트 핸들러
   */
  private handleSelectDeck(socket: Socket): void {
    socket.on(
      SocketEvent.SELECT_DECK,
      async (
        { roomId, deckIndex }: { roomId: string; deckIndex: number },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.selectDeck(roomId, socket.id, deckIndex);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * PLAY_CARD 이벤트 핸들러
   */
  private handlePlayCard(socket: Socket): void {
    socket.on(
      SocketEvent.PLAY_CARD,
      async (
        { roomId, cards }: { roomId: string; cards: Array<{ rank: number; isJoker: boolean }> },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.playOrPass(roomId, socket.id, cards);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * PASS 이벤트 핸들러
   */
  private handlePass(socket: Socket): void {
    socket.on(
      SocketEvent.PASS,
      async (
        { roomId }: { roomId: string },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.playOrPass(
          roomId,
          socket.id,
          [] // 빈 배열이면 패스
        );

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * VOTE 이벤트 핸들러
   */
  private handleVote(socket: Socket): void {
    socket.on(
      SocketEvent.VOTE,
      async (
        { roomId, vote }: { roomId: string; vote: boolean },
        callback?: SocketCallback
      ) => {
        const result = await this.commandService.voteNextGame(roomId, socket.id, vote);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * GET_GAME_STATE 이벤트 핸들러
   */
  private handleGetGameState(socket: Socket): void {
    socket.on(
      SocketEvent.GET_GAME_STATE,
      async (
        { roomId }: { roomId: string },
        callback?: SocketCallback
      ) => {
        try {
          // Query: 게임 상태 조회
          const gameState = await this.queryService.getGameState(roomId);

          if (typeof callback === 'function') {
            callback(
              gameState
                ? { success: true, data: gameState }
                : { success: false, error: '게임 상태를 찾을 수 없습니다.' }
            );
          }
        } catch (error) {
          console.error('GET_GAME_STATE error:', error);
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            });
          }
        }
      }
    );
  }

  /**
   * 게임 상태를 해당 룸의 모든 클라이언트에게 브로드캐스트
   */
  private async emitGameState(roomId: string): Promise<void> {
    // Query: 게임 상태 조회
    const gameState = await this.queryService.getGameState(roomId);

    if (gameState) {
      this.io.to(roomId).emit(SocketEvent.GAME_STATE_UPDATED, gameState);
    }
  }

  /**
   * Socket 이벤트 핸들러 공통 로직
   *
   * @param useCaseResult - Use Case 실행 결과
   * @param callback - Socket.IO 콜백 함수
   * @param roomId - 브로드캐스트할 룸 ID (선택사항)
   * @param onSuccess - 성공 시 추가 작업 (선택사항)
   */
  private async handleSocketEvent<T>(
    useCaseResult: UseCaseResponse<T>,
    callback?: SocketCallback<T>,
    roomId?: string,
    onSuccess?: () => void | Promise<void>
  ): Promise<void> {
    try {
      if (useCaseResult.success) {
        // 성공 시 콜백 호출
        if (typeof callback === 'function') {
          callback({ success: true, data: useCaseResult.data });
        }

        // 추가 작업 실행 (예: socket.join)
        if (onSuccess) {
          await onSuccess();
        }

        // 게임 상태 브로드캐스트
        if (roomId) {
          await this.emitGameState(roomId);
        }
      } else {
        // 실패 시 콜백 호출
        if (typeof callback === 'function') {
          callback({
            success: false,
            error: useCaseResult.error.message,
          });
        }
      }
    } catch (error) {
      // 예외 처리
      console.error('Socket event handling error:', error);
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
  }
}
