/**
 * SocketCoordinator.test.ts
 *
 * SocketCoordinator의 단위 테스트
 */

import { Server } from 'socket.io';
import { SocketCoordinator } from '../../../src/presentation/socket/SocketCoordinator';
import { GameCommandService } from '../../../src/application/services/GameCommandService';
import { GameQueryService } from '../../../src/application/services/GameQueryService';

describe('SocketCoordinator', () => {
  let mockIo: any;
  let mockCommandService: jest.Mocked<GameCommandService>;
  let mockQueryService: jest.Mocked<GameQueryService>;
  let mockSocket: any;
  let connectionHandler: Function;

  beforeEach(() => {
    // Mock Socket
    mockSocket = {
      id: 'socket-123',
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    // Mock Socket.IO Server
    mockIo = {
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock CommandService
    mockCommandService = {
      createAndJoinGame: jest.fn(),
      joinGame: jest.fn(),
      leaveGame: jest.fn(),
      toggleReadyAndCheckStart: jest.fn(),
      voteNextGame: jest.fn(),
      playOrPass: jest.fn(),
      selectDeck: jest.fn(),
      selectRole: jest.fn(),
    } as any;

    // Mock QueryService
    mockQueryService = {
      getGameState: jest.fn(),
    } as any;
  });

  describe('constructor', () => {
    it('connection 이벤트를 등록해야 한다', () => {
      new SocketCoordinator(mockIo, mockCommandService, mockQueryService);

      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('setupConnection', () => {
    beforeEach(() => {
      new SocketCoordinator(mockIo, mockCommandService, mockQueryService);
    });

    it('새 소켓 연결 시 모든 Adapter를 등록해야 한다', () => {
      connectionHandler(mockSocket);

      // GameEventAdapter 이벤트들
      expect(mockSocket.on).toHaveBeenCalledWith('createGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('joinGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leaveGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vote', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('getGameState', expect.any(Function));

      // CardEventAdapter 이벤트들
      expect(mockSocket.on).toHaveBeenCalledWith('playCard', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('pass', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('selectDeck', expect.any(Function));

      // RoleSelectionEventAdapter 이벤트들
      expect(mockSocket.on).toHaveBeenCalledWith('selectRole', expect.any(Function));

      // disconnect 이벤트
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('handleDisconnect', () => {
    let disconnectHandler: Function;

    beforeEach(() => {
      new SocketCoordinator(mockIo, mockCommandService, mockQueryService);
      connectionHandler(mockSocket);

      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const disconnectCall = onCalls.find((call) => call[0] === 'disconnect');
      disconnectHandler = disconnectCall![1];
    });

    it('플레이어가 게임에 참가하지 않은 경우 아무 작업도 하지 않아야 한다', async () => {
      await disconnectHandler();

      expect(mockCommandService.leaveGame).not.toHaveBeenCalled();
    });

    it('플레이어가 게임에 참가한 경우 자동으로 나가야 한다', async () => {
      // 먼저 플레이어가 게임에 참가
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const joinGameHandler = onCalls.find((call) => call[0] === 'joinGame')![1];

      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.joinGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as any);
      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      await joinGameHandler({ roomId: 'room-123', nickname: 'Player1' }, jest.fn());

      // 이제 disconnect
      mockCommandService.leaveGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as any);
      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      await disconnectHandler();

      expect(mockCommandService.leaveGame).toHaveBeenCalledWith('room-123', 'socket-123');
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', mockGameState);
    });

    it('게임 상태가 없으면 브로드캐스트하지 않아야 한다', async () => {
      // 플레이어가 게임에 참가
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const joinGameHandler = onCalls.find((call) => call[0] === 'joinGame')![1];

      mockCommandService.joinGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123' },
      } as any);
      mockQueryService.getGameState.mockResolvedValueOnce({ roomId: 'room-123' } as any);

      await joinGameHandler({ roomId: 'room-123', nickname: 'Player1' }, jest.fn());

      // emit mock 초기화
      mockIo.emit.mockClear();

      // disconnect 시 게임 상태가 null
      mockCommandService.leaveGame.mockResolvedValue({
        success: true,
        data: null,
      } as any);
      mockQueryService.getGameState.mockResolvedValueOnce(null);

      await disconnectHandler();

      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('disconnect 처리 중 에러가 발생해도 앱이 중단되지 않아야 한다', async () => {
      // 플레이어가 게임에 참가
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const joinGameHandler = onCalls.find((call) => call[0] === 'joinGame')![1];

      mockCommandService.joinGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123' },
      } as any);
      mockQueryService.getGameState.mockResolvedValue({ roomId: 'room-123' } as any);

      await joinGameHandler({ roomId: 'room-123', nickname: 'Player1' }, jest.fn());

      // disconnect 시 에러 발생
      mockCommandService.leaveGame.mockRejectedValue(new Error('Database error'));

      // 에러가 발생해도 앱이 중단되지 않아야 함
      await expect(disconnectHandler()).resolves.not.toThrow();
    });
  });

  describe('Adapter 통합 테스트', () => {
    beforeEach(() => {
      new SocketCoordinator(mockIo, mockCommandService, mockQueryService);
      connectionHandler(mockSocket);
    });

    it('CREATE_GAME과 JOIN_GAME이 playerRooms를 올바르게 관리해야 한다', async () => {
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const createGameHandler = onCalls.find((call) => call[0] === 'createGame')![1];

      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.createAndJoinGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123', gameState: mockGameState },
      } as any);
      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      await createGameHandler({ nickname: 'Player1' }, jest.fn());

      // 이제 disconnect하면 playerRooms에서 제거되어야 함
      const onCalls2 = mockSocket.on.mock.calls as [string, Function][];
      const disconnectHandler = onCalls2.find((call) => call[0] === 'disconnect')![1];

      mockCommandService.leaveGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as any);

      await disconnectHandler();

      expect(mockCommandService.leaveGame).toHaveBeenCalledWith('room-123', 'socket-123');
    });

    it('LEAVE_GAME 후 disconnect 시 leaveGame이 중복 호출되지 않아야 한다', async () => {
      // 먼저 JOIN
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const joinGameHandler = onCalls.find((call) => call[0] === 'joinGame')![1];

      mockCommandService.joinGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123' },
      } as any);
      mockQueryService.getGameState.mockResolvedValue({ roomId: 'room-123' } as any);

      await joinGameHandler({ roomId: 'room-123', nickname: 'Player1' }, jest.fn());

      // LEAVE
      const onCalls2 = mockSocket.on.mock.calls as [string, Function][];
      const leaveGameHandler = onCalls2.find((call) => call[0] === 'leaveGame')![1];

      mockCommandService.leaveGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123' },
      } as any);

      await leaveGameHandler({ roomId: 'room-123' }, jest.fn());

      // disconnect
      const onCalls3 = mockSocket.on.mock.calls as [string, Function][];
      const disconnectHandler = onCalls3.find((call) => call[0] === 'disconnect')![1];

      mockCommandService.leaveGame.mockClear();
      await disconnectHandler();

      // LEAVE_GAME에서 이미 나갔으므로 disconnect에서는 호출되지 않아야 함
      expect(mockCommandService.leaveGame).not.toHaveBeenCalled();
    });
  });
});
