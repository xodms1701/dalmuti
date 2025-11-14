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

export class SocketController {
  private io: Server;
  private commandService: GameCommandService;
  private queryService: GameQueryService;

  constructor(
    io: Server,
    commandService: GameCommandService,
    queryService: GameQueryService
  ) {
    this.io = io;
    this.commandService = commandService;
    this.queryService = queryService;
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

      socket.on('disconnect', () => {
        console.log('클라이언트가 연결 해제되었습니다:', socket.id);
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        // Command: 게임 생성 및 참가
        const result = await this.commandService.createAndJoinGame(socket.id, nickname);

        if (result.success) {
          // Socket 룸에 참가
          socket.join(result.data.roomId);

          // 클라이언트에게 응답
          if (typeof callback === 'function') {
            callback({
              success: true,
              data: { roomId: result.data.roomId, nickname },
            });
          }

          // 게임 상태 브로드캐스트
          await this.emitGameState(result.data.roomId);
        } else {
          // 에러 응답
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.joinGame(
          roomId,
          socket.id,
          nickname
        );

        if (result.success) {
          socket.join(roomId);

          if (typeof callback === 'function') {
            callback({
              success: true,
              data: { roomId, nickname },
            });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.leaveGame(
          roomId,
          socket.id
        );

        if (result.success) {
          socket.leave(roomId);

          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        // Command: 준비 상태 토글 (현재 상태의 반대로 변경)
        const result = await this.commandService.toggleReadyAndCheckStart(
          roomId,
          socket.id
        );

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.selectRole(
          roomId,
          socket.id,
          roleNumber
        );

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.selectDeck(
          roomId,
          socket.id,
          deckIndex
        );

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.playOrPass(roomId, socket.id, cards);

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.playOrPass(
          roomId,
          socket.id,
          [] // 빈 배열이면 패스
        );

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        const result = await this.commandService.voteNextGame(
          roomId,
          socket.id,
          vote
        );

        if (result.success) {
          if (typeof callback === 'function') {
            callback({ success: true, data: result.data });
          }

          await this.emitGameState(roomId);
        } else {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: result.error.message,
            });
          }
        }
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
        callback?: (response: { success: boolean; data?: any; error?: string }) => void
      ) => {
        // Query: 게임 상태 조회
        const gameState = await this.queryService.getGameState(roomId);

        if (typeof callback === 'function') {
          callback(
            gameState
              ? { success: true, data: gameState }
              : { success: false, error: '게임 상태를 찾을 수 없습니다.' }
          );
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
}
