/**
 * GameEventAdapter.test.ts
 *
 * GameEventAdapter의 단위 테스트
 */

import { Server } from 'socket.io';
import { GameEventAdapter } from '../../../../src/presentation/socket/adapters/GameEventAdapter';
import { GameCommandService } from '../../../../src/application/services/GameCommandService';
import { GameQueryService } from '../../../../src/application/services/GameQueryService';
import { UseCaseResponse } from '../../../../src/application/dto/common/BaseResponse';

describe('GameEventAdapter', () => {
  let adapter: GameEventAdapter;
  let mockIo: jest.Mocked<Server>;
  let mockCommandService: jest.Mocked<GameCommandService>;
  let mockQueryService: jest.Mocked<GameQueryService>;
  let playerRooms: Map<string, string>;
  let mockSocket: any;

  beforeEach(() => {
    // Mock Socket.IO Server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Mock CommandService
    mockCommandService = {
      createAndJoinGame: jest.fn(),
      joinGame: jest.fn(),
      leaveGame: jest.fn(),
      toggleReadyAndCheckStart: jest.fn(),
      voteNextGame: jest.fn(),
    } as any;

    // Mock QueryService
    mockQueryService = {
      getGameState: jest.fn(),
    } as any;

    // Player rooms map
    playerRooms = new Map();

    // Mock Socket
    mockSocket = {
      id: 'socket-123',
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    // Create adapter
    adapter = new GameEventAdapter(mockIo, mockCommandService, mockQueryService, playerRooms);
  });

  describe('register', () => {
    it('모든 이벤트 핸들러가 등록되어야 한다', () => {
      adapter.register(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('createGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('joinGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leaveGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vote', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('getGameState', expect.any(Function));
    });
  });

  describe('CREATE_GAME 이벤트', () => {
    let createGameHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const createGameCall = onCalls.find((call) => call[0] === 'createGame');
      createGameHandler = createGameCall![1];
    });

    it('성공 시 게임을 생성하고 룸에 참가해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.createAndJoinGame.mockResolvedValue({
        success: true,
        data: { roomId: 'room-123', gameState: mockGameState },
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await createGameHandler({ nickname: 'Player1' }, callback);

      expect(mockCommandService.createAndJoinGame).toHaveBeenCalledWith('socket-123', 'Player1');
      expect(mockSocket.join).toHaveBeenCalledWith('room-123');
      expect(playerRooms.get('socket-123')).toBe('room-123');
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: { roomId: 'room-123', gameState: mockGameState },
      });
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
      expect(mockIo.emit).toHaveBeenCalledWith('GAME_STATE_UPDATED', mockGameState);
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      mockCommandService.createAndJoinGame.mockResolvedValue({
        success: false,
        error: { message: 'Failed to create game' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await createGameHandler({ nickname: 'Player1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create game',
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('JOIN_GAME 이벤트', () => {
    let joinGameHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const joinGameCall = onCalls.find((call) => call[0] === 'joinGame');
      joinGameHandler = joinGameCall![1];
    });

    it('성공 시 게임에 참가하고 룸에 조인해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.joinGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await joinGameHandler({ roomId: 'room-123', nickname: 'Player2' }, callback);

      expect(mockCommandService.joinGame).toHaveBeenCalledWith('room-123', 'socket-123', 'Player2');
      expect(mockSocket.join).toHaveBeenCalledWith('room-123');
      expect(playerRooms.get('socket-123')).toBe('room-123');
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      mockCommandService.joinGame.mockResolvedValue({
        success: false,
        error: { message: 'Room not found' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await joinGameHandler({ roomId: 'room-999', nickname: 'Player2' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Room not found',
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('LEAVE_GAME 이벤트', () => {
    let leaveGameHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const leaveGameCall = onCalls.find((call) => call[0] === 'leaveGame');
      leaveGameHandler = leaveGameCall![1];
      playerRooms.set('socket-123', 'room-123');
    });

    it('성공 시 게임에서 나가고 룸에서 나가야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.leaveGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await leaveGameHandler({ roomId: 'room-123' }, callback);

      expect(mockCommandService.leaveGame).toHaveBeenCalledWith('room-123', 'socket-123');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
      expect(playerRooms.has('socket-123')).toBe(false);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
    });
  });

  describe('READY 이벤트', () => {
    let readyHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const readyCall = onCalls.find((call) => call[0] === 'ready');
      readyHandler = readyCall![1];
    });

    it('준비 상태를 토글하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.toggleReadyAndCheckStart.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await readyHandler({ roomId: 'room-123' }, callback);

      expect(mockCommandService.toggleReadyAndCheckStart).toHaveBeenCalledWith(
        'room-123',
        'socket-123'
      );
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
    });
  });

  describe('VOTE 이벤트', () => {
    let voteHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const voteCall = onCalls.find((call) => call[0] === 'vote');
      voteHandler = voteCall![1];
    });

    it('투표를 처리하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockCommandService.voteNextGame.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await voteHandler({ roomId: 'room-123', vote: true }, callback);

      expect(mockCommandService.voteNextGame).toHaveBeenCalledWith('room-123', 'socket-123', true);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
    });
  });

  describe('GET_GAME_STATE 이벤트', () => {
    let getGameStateHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const getGameStateCall = onCalls.find((call) => call[0] === 'getGameState');
      getGameStateHandler = getGameStateCall![1];
    });

    it('게임 상태를 조회하여 반환해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'waiting' };
      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await getGameStateHandler({ roomId: 'room-123' }, callback);

      expect(mockQueryService.getGameState).toHaveBeenCalledWith('room-123');
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
    });

    it('게임 상태가 없으면 에러를 반환해야 한다', async () => {
      mockQueryService.getGameState.mockResolvedValue(null);

      const callback = jest.fn();
      await getGameStateHandler({ roomId: 'room-999' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: '게임 상태를 찾을 수 없습니다.',
      });
    });
  });
});
