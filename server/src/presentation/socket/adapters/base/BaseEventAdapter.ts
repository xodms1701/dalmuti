/**
 * BaseEventAdapter.ts
 *
 * Primary Adapter Base Class for Socket.IO Event Handlers
 *
 * 책임:
 * 1. ISocketEventPort 구현
 * 2. 공통 Socket.IO 이벤트 처리 로직 제공
 * 3. Use Case 응답 → Socket.IO 응답 변환
 * 4. 에러 처리 및 브로드캐스트
 *
 * 헥사고날 아키텍처:
 * - Primary Adapter (Driving Adapter) Base Class
 * - ISocketEventPort 구현
 * - 외부(Socket.IO) → 내부(Application Core) 요청 변환
 */

import { Server, Socket, Namespace } from 'socket.io';
import { GameCommandService } from '../../../../application/services/GameCommandService';
import { GameQueryService } from '../../../../application/services/GameQueryService';
import { UseCaseResponse } from '../../../../application/dto/common/BaseResponse';
import { ISocketEventPort } from '../../ports/ISocketEventPort';

/**
 * Socket.IO 응답 타입
 */
export type SocketResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Socket.IO 콜백 타입
 */
export type SocketCallback<T = unknown> = (response: SocketResponse<T>) => void;

/**
 * BaseEventAdapter
 *
 * 모든 Primary Adapter의 base class
 * ISocketEventPort를 구현하고 공통 로직을 제공합니다.
 */
export abstract class BaseEventAdapter implements ISocketEventPort {
  protected io: Server | Namespace;

  protected commandService: GameCommandService;

  protected queryService: GameQueryService;

  protected playerRooms: Map<string, string>; // playerId → roomId 매핑

  constructor(
    io: Server | Namespace,
    commandService: GameCommandService,
    queryService: GameQueryService,
    playerRooms: Map<string, string>
  ) {
    this.io = io;
    this.commandService = commandService;
    this.queryService = queryService;
    this.playerRooms = playerRooms;
  }

  /**
   * ISocketEventPort 구현
   * 각 Adapter가 구현해야 하는 메서드
   * Socket 연결 시 이벤트 핸들러를 등록합니다.
   */
  abstract register(socket: Socket): void;

  /**
   * 공통 Socket 이벤트 처리 헬퍼
   *
   * Use Case 응답을 처리하고 클라이언트에게 전달합니다.
   *
   * @param useCaseResult - Use Case 실행 결과
   * @param callback - Socket.IO acknowledgement 콜백
   * @param roomId - 브로드캐스트할 방 ID (optional)
   * @param onSuccess - 성공 시 추가 작업 (optional)
   */
  protected async handleSocketEvent<T>(
    useCaseResult: UseCaseResponse<T>,
    callback?: SocketCallback<T>,
    roomId?: string,
    onSuccess?: () => Promise<void>
  ): Promise<void> {
    try {
      if (useCaseResult.success) {
        // 성공 시 콜백 호출
        if (typeof callback === 'function') {
          callback({
            success: true,
            data: useCaseResult.data,
          });
        }

        // 성공 시 추가 작업 실행
        if (onSuccess) {
          await onSuccess();
        }

        // 게임 상태 브로드캐스트
        if (roomId) {
          await this.emitGameState(roomId);
        }
      } else if (typeof callback === 'function') {
        // 실패 시 콜백 호출
        callback({
          success: false,
          error: useCaseResult.error.message,
        });
      }
    } catch (error) {
      // 예외 처리
      console.error('Socket event handling error:', error);
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * 게임 상태를 방에 브로드캐스트
   *
   * @param roomId - 브로드캐스트할 방 ID
   */
  protected async emitGameState(roomId: string): Promise<void> {
    try {
      const gameState = await this.queryService.getGameState(roomId);
      if (gameState) {
        this.io.to(roomId).emit('GAME_STATE_UPDATED', { game: gameState });
      }
    } catch (error) {
      console.error('Failed to emit game state:', error);
    }
  }
}
