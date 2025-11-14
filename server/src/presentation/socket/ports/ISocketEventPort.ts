/**
 * ISocketEventPort.ts
 *
 * Primary Port (Driving Port) for Socket.IO Event Handling
 *
 * 헥사고날 아키텍처:
 * - Primary Port: Application Core로 들어오는 인터페이스 (계약)
 * - Socket.IO Event → Application Core
 *
 * 책임:
 * - Socket 이벤트 핸들러 등록 계약 정의
 * - Primary Adapter들이 구현해야 할 인터페이스
 */

import { Socket } from 'socket.io';

/**
 * ISocketEventPort
 *
 * Primary Adapter들이 구현해야 하는 Port 인터페이스
 * Socket 연결 시 이벤트 핸들러를 등록하는 계약을 정의합니다.
 */
export interface ISocketEventPort {
  /**
   * Socket 연결 시 이벤트 핸들러 등록
   *
   * @param socket - Socket.IO Socket 인스턴스
   */
  register(socket: Socket): void;
}
