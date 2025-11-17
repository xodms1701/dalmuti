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
import { BaseEventAdapter, SocketCallback } from './base/BaseEventAdapter';
import { SocketEvent } from '../../../../socket/events';

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
    this.handleStartGame(socket);
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
        const roomId = result.success ? result.data.roomId : undefined;

        await this.handleSocketEvent(
          result,
          callback,
          roomId,
          roomId
            ? async () => {
                // Socket 룸에 참가
                socket.join(roomId);
                // 플레이어-룸 매핑 저장
                this.playerRooms.set(socket.id, roomId);
              }
            : undefined
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
            socket.join(roomId);
            this.playerRooms.set(socket.id, roomId);
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
            socket.leave(roomId);
            this.playerRooms.delete(socket.id);
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
   *
   * 모든 플레이어가 준비되면 ALL_PLAYERS_READY 이벤트를 브로드캐스트합니다.
   */
  private handleReady(socket: Socket): void {
    socket.on(
      SocketEvent.READY,
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
        // Command: 준비 상태 토글 (현재 상태의 반대로 변경)
        const result = await this.commandService.toggleReadyAndCheckStart(roomId, socket.id);

        await this.handleSocketEvent(result, callback, roomId);

        // 모든 플레이어가 준비되었으면 ALL_PLAYERS_READY 브로드캐스트
        if (result.success && result.data.allPlayersReady) {
          this.io.to(roomId).emit(SocketEvent.ALL_PLAYERS_READY);
        }
      }
    );
  }

  /**
   * START_GAME 이벤트 핸들러
   *
   * 대기 중인 게임을 시작하여 역할 선택 단계로 진입합니다.
   */
  private handleStartGame(socket: Socket): void {
    socket.on(
      SocketEvent.START_GAME,
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
        // Command: 게임 시작
        const result = await this.commandService.startGame(roomId);

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
        await this.handleQueryEvent(
          () => this.queryService.getGameState(roomId),
          callback,
          '게임 상태를 찾을 수 없습니다.'
        );
      }
    );
  }
}
