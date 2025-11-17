/**
 * CardEventAdapter.ts
 *
 * Primary Adapter for Card-related Events
 *
 * 책임:
 * 1. 카드 관련 Socket.IO 이벤트 처리
 * 2. 카드 플레이, 패스, 덱 선택 등
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
 * CardEventAdapter
 *
 * 카드 관련 이벤트를 처리하는 Primary Adapter
 */
export class CardEventAdapter extends BaseEventAdapter {
  /**
   * ISocketEventPort 구현
   * Socket 연결 시 이벤트 핸들러 등록
   */
  register(socket: Socket): void {
    this.handlePlayCard(socket);
    this.handlePass(socket);
    this.handleSelectDeck(socket);
  }

  /**
   * PLAY_CARD 이벤트 핸들러
   *
   * 플레이어가 카드를 플레이합니다.
   */
  private handlePlayCard(socket: Socket): void {
    socket.on(
      SocketEvent.PLAY_CARD,
      async (
        { roomId, cards }: { roomId: string; cards: Array<{ rank: number; isJoker: boolean }> },
        callback?: SocketCallback
      ) => {
        // Command: 카드 플레이 또는 패스
        const result = await this.commandService.playOrPass(roomId, socket.id, cards);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }

  /**
   * PASS 이벤트 핸들러
   *
   * 플레이어가 턴을 패스합니다.
   */
  private handlePass(socket: Socket): void {
    socket.on(
      SocketEvent.PASS,
      async ({ roomId }: { roomId: string }, callback?: SocketCallback) => {
        // Command: 패스 (빈 배열 전달)
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
   * SELECT_DECK 이벤트 핸들러
   *
   * 역할 선택 후 플레이어가 카드 덱을 선택합니다.
   */
  private handleSelectDeck(socket: Socket): void {
    socket.on(
      SocketEvent.SELECT_DECK,
      async (
        { roomId, cardIndex }: { roomId: string; cardIndex: number },
        callback?: SocketCallback
      ) => {
        // Command: 덱 선택
        const result = await this.commandService.selectDeck(roomId, socket.id, cardIndex);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }
}
