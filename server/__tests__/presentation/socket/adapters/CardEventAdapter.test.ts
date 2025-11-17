/**
 * CardEventAdapter.test.ts
 *
 * CardEventAdapter의 단위 테스트
 */

import { Server } from 'socket.io';
import { CardEventAdapter } from '../../../../src/presentation/socket/adapters/CardEventAdapter';
import { GameCommandService } from '../../../../src/application/services/GameCommandService';
import { GameQueryService } from '../../../../src/application/services/GameQueryService';
import { UseCaseResponse } from '../../../../src/application/dto/common/BaseResponse';

describe('CardEventAdapter', () => {
  let adapter: CardEventAdapter;
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
      playOrPass: jest.fn(),
      selectDeck: jest.fn(),
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
    };

    // Create adapter
    adapter = new CardEventAdapter(mockIo, mockCommandService, mockQueryService, playerRooms);
  });

  describe('register', () => {
    it('모든 이벤트 핸들러가 등록되어야 한다', () => {
      adapter.register(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('playCard', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('pass', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('selectDeck', expect.any(Function));
    });
  });

  describe('PLAY_CARD 이벤트', () => {
    let playCardHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const playCardCall = onCalls.find((call) => call[0] === 'playCard');
      playCardHandler = playCardCall![1];
    });

    it('성공 시 카드를 플레이하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'playing' };
      const cards = [
        { rank: 5, isJoker: false },
        { rank: 5, isJoker: false },
      ];

      mockCommandService.playOrPass.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await playCardHandler({ roomId: 'room-123', cards }, callback);

      expect(mockCommandService.playOrPass).toHaveBeenCalledWith('room-123', 'socket-123', cards);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
      expect(mockIo.emit).toHaveBeenCalledWith('GAME_STATE_UPDATED', mockGameState);
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      const cards = [{ rank: 5, isJoker: false }];

      mockCommandService.playOrPass.mockResolvedValue({
        success: false,
        error: { message: 'Invalid cards' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await playCardHandler({ roomId: 'room-123', cards }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid cards',
      });
    });
  });

  describe('PASS 이벤트', () => {
    let passHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const passCall = onCalls.find((call) => call[0] === 'pass');
      passHandler = passCall![1];
    });

    it('성공 시 패스를 처리하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'playing' };

      mockCommandService.playOrPass.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await passHandler({ roomId: 'room-123' }, callback);

      expect(mockCommandService.playOrPass).toHaveBeenCalledWith('room-123', 'socket-123', []);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      mockCommandService.playOrPass.mockResolvedValue({
        success: false,
        error: { message: 'Cannot pass now' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await passHandler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot pass now',
      });
    });
  });

  describe('SELECT_DECK 이벤트', () => {
    let selectDeckHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls as [string, Function][];
      const selectDeckCall = onCalls.find((call) => call[0] === 'selectDeck');
      selectDeckHandler = selectDeckCall![1];
    });

    it('성공 시 덱을 선택하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = { roomId: 'room-123', phase: 'cardSelection' };

      mockCommandService.selectDeck.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await selectDeckHandler({ roomId: 'room-123', cardIndex: 0 }, callback);

      expect(mockCommandService.selectDeck).toHaveBeenCalledWith('room-123', 'socket-123', 0);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      mockCommandService.selectDeck.mockResolvedValue({
        success: false,
        error: { message: 'Deck already selected' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await selectDeckHandler({ roomId: 'room-123', cardIndex: 0 }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Deck already selected',
      });
    });
  });
});
