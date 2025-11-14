/**
 * RoleSelectionEventAdapter.ts
 *
 * Primary Adapter for Role Selection Events
 *
 * 책임:
 * 1. 역할 선택 관련 Socket.IO 이벤트 처리
 * 2. 플레이어의 순위(역할) 선택
 * 3. 혁명 선택 처리
 * 4. Use Case 호출 및 응답 처리
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
    this.handleSelectRevolution(socket);
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

  /**
   * SELECT_REVOLUTION 이벤트 핸들러
   *
   * 조커 2장 보유 플레이어가 혁명 여부를 선택합니다.
   * - 혁명 선택 시: 대혁명(꼴찌면 순위 반전) 또는 일반혁명 → playing 페이즈
   * - 혁명 거부 시: 세금 교환 → tax 페이즈
   */
  private handleSelectRevolution(socket: Socket): void {
    socket.on(
      SocketEvent.SELECT_REVOLUTION,
      async (
        { roomId, wantRevolution }: { roomId: string; wantRevolution: boolean },
        callback?: SocketCallback
      ) => {
        // Command: 혁명 선택
        const result = await this.commandService.selectRevolution(
          roomId,
          socket.id,
          wantRevolution
        );

        await this.handleSocketEvent(result, callback, roomId);
      }
    );
  }
}
