/**
 * SocketCoordinator.ts
 *
 * Socket.IO Connection Coordinator
 *
 * 책임:
 * 1. Socket.IO 연결 관리
 * 2. 각 Primary Adapter 등록 및 조율
 * 3. 연결 해제(disconnect) 처리
 *
 * 헥사고날 아키텍처:
 * - Primary Adapter Coordinator
 * - 여러 Primary Adapter들을 관리하고 조율
 * - 자체는 Adapter가 아님 (조율자 역할)
 */

import { Server, Socket, Namespace } from 'socket.io';
import { GameCommandService } from '../../application/services/GameCommandService';
import { GameQueryService } from '../../application/services/GameQueryService';
import { GameEventAdapter } from './adapters/GameEventAdapter';
import { CardEventAdapter } from './adapters/CardEventAdapter';
import { RoleSelectionEventAdapter } from './adapters/RoleSelectionEventAdapter';
import { ISocketEventPort } from './ports/ISocketEventPort';

/**
 * SocketCoordinator
 *
 * Socket.IO 연결을 관리하고 각 Adapter를 등록합니다.
 */
export class SocketCoordinator {
  private io: Server | Namespace;

  private commandService: GameCommandService;

  private queryService: GameQueryService;

  private playerRooms: Map<string, string>; // playerId → roomId 매핑

  // Primary Adapters - 배열로 관리하여 확장성 향상
  private adapters: ISocketEventPort[];

  constructor(
    io: Server | Namespace,
    commandService: GameCommandService,
    queryService: GameQueryService
  ) {
    this.io = io;
    this.commandService = commandService;
    this.queryService = queryService;
    this.playerRooms = new Map();

    // Adapter 클래스 배열 정의
    const adapterClasses = [GameEventAdapter, CardEventAdapter, RoleSelectionEventAdapter];

    // Adapter 인스턴스 동적 생성
    this.adapters = adapterClasses.map(
      (AdapterClass) => new AdapterClass(io, commandService, queryService, this.playerRooms)
    );

    // Socket.IO 연결 처리 시작
    this.setupConnection();
  }

  /**
   * Socket.IO 연결 설정
   */
  private setupConnection(): void {
    this.io.on('connection', (socket: Socket) => {
      // eslint-disable-next-line no-console
      console.log('새로운 클라이언트가 연결되었습니다:', socket.id);

      // 모든 Adapter 등록
      this.adapters.forEach((adapter) => adapter.register(socket));

      // 연결 해제 처리
      this.handleDisconnect(socket);
    });
  }

  /**
   * 연결 해제 처리
   *
   * 플레이어가 연결을 끊으면 자동으로 게임에서 나가게 처리합니다.
   */
  private handleDisconnect(socket: Socket): void {
    socket.on('disconnect', async () => {
      // eslint-disable-next-line no-console
      console.log('클라이언트가 연결 해제되었습니다:', socket.id);

      // 플레이어가 게임 중이었다면 자동으로 나가기 처리
      const roomId = this.playerRooms.get(socket.id);
      if (roomId) {
        try {
          await this.commandService.leaveGame(roomId, socket.id);
          this.playerRooms.delete(socket.id);

          // 게임 상태 브로드캐스트
          const gameState = await this.queryService.getGameState(roomId);
          if (gameState) {
            this.io.to(roomId).emit('gameStateUpdated', gameState);
          }

          // eslint-disable-next-line no-console
          console.log(`플레이어 ${socket.id}가 게임 ${roomId}에서 자동으로 나갔습니다.`);
        } catch (error) {
          console.error('Disconnect 처리 중 오류:', error);
        }
      }
    });
  }
}
