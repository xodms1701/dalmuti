/**
 * GameEventAdapter.ts
 *
 * Primary Adapter for Game Lifecycle Events
 *
 * 책임:
 * 1. 게임 생명주기 관련 Socket.IO 이벤트 처리
 * 2. 게임 생성, 참가, 나가기, 준비, 투표 등
 * 3. Use Case 호출 및 응답 처리
 *
 * 헥사고날 아키텍처:
 * - Primary Adapter (Driving Adapter)
 * - ISocketEventPort 구현
 * - Socket.IO → Application Core
 */

import { Socket } from 'socket.io';
import { SocketEvent } from '../../../../socket/events';
import { BaseEventAdapter, SocketCallback } from './base/BaseEventAdapter';

/**
 * GameEventAdapter
 *
 * 게임 생명주기 관련 이벤트를 처리하는 Primary Adapter
 */
export class GameEventAdapter extends BaseEventAdapter {
  /**
   * ISocketEventPort 구현
   * Socket 연결 시 이벤트 핸들러 등록
   */
  register(socket: Socket): void {
    this.handleCreateGame(socket);
    this.handleJoinGame(socket);
    this.handleLeaveGame(socket);
    this.handleReady(socket);
    this.handleVote(socket);
    this.handleGetGameState(socket);
  }

  /**
   * CREATE_GAME 이벤트 핸들러
   *
   * 새 게임을 생성하고 생성자를 자동으로 참가시킵니다.
   */
  private handleCreateGame(socket: Socket): void {
    socket.on(
      SocketEvent.CREATE_GAME,
      async ({ nickname }: { nickname: string }, callback?: SocketCallback) => {
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
   *
   * 기존 게임에 플레이어를 참가시킵니다.
   */
  private handleJoinGame(socket: Socket): void {
    socket.on(
      SocketEvent.JOIN_GAME,
      async (
        { roomId, nickname }: { roomId: string; nickname: string },
        callback?: SocketCallback
      ) => {
        // Command: 게임 참가
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
   *
   * 플레이어를 게임에서 퇴장시킵니다.
   */
  private handleLeaveGame(socket: Socket): void {
    socket.on(
      SocketEvent.LEAVE_GAME,
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
        // Command: 게임 나가기
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
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
        // Command: 준비 상태 토글 (현재 상태의 반대로 변경)
        const result = await this.commandService.toggleReadyAndCheckStart(roomId, socket.id);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * VOTE 이벤트 핸들러
   *
   * 게임 종료 후 다음 게임 진행 여부에 투표합니다.
   */
  private handleVote(socket: Socket): void {
    socket.on(
      SocketEvent.VOTE,
      async ({ roomId, vote }: { roomId: string; vote: boolean }, callback?: SocketCallback) => {
        // Command: 다음 게임 투표
        const result = await this.commandService.voteNextGame(roomId, socket.id, vote);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * GET_GAME_STATE 이벤트 핸들러
   *
   * 현재 게임 상태를 조회합니다 (Query).
   */
  private handleGetGameState(socket: Socket): void {
    socket.on(
      SocketEvent.GET_GAME_STATE,
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
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
}
