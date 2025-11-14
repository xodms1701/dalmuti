/**
 * RoleSelectionEventAdapter.ts
 *
 * Primary Adapter for Role Selection Events
 *
 * 책임:
 * 1. 역할 선택 관련 Socket.IO 이벤트 처리
 * 2. 플레이어의 순위(역할) 선택
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
 * RoleSelectionEventAdapter
 *
 * 역할 선택 이벤트를 처리하는 Primary Adapter
 */
export class RoleSelectionEventAdapter extends BaseEventAdapter {
  /**
   * ISocketEventPort 구현
   * Socket 연결 시 이벤트 핸들러 등록
   */
  register(socket: Socket): void {
    this.handleSelectRole(socket);
  }

  /**
   * SELECT_ROLE 이벤트 핸들러
   *
   * 플레이어가 역할(순위)을 선택합니다.
   * 13개의 역할 카드 중 하나를 선택하여 자신의 순위를 결정합니다.
   */
  private handleSelectRole(socket: Socket): void {
    socket.on(
      SocketEvent.SELECT_ROLE,
      async (
        { roomId, roleNumber }: { roomId: string; roleNumber: number },
        callback?: SocketCallback
      ) => {
        // Command: 역할 선택
        const result = await this.commandService.selectRole(roomId, socket.id, roleNumber);

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }
}
