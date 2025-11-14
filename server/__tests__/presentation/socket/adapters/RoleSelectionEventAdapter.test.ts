/**
 * RoleSelectionEventAdapter.test.ts
 *
 * RoleSelectionEventAdapter의 단위 테스트
 */

import { Server } from 'socket.io';
import { RoleSelectionEventAdapter } from '../../../../src/presentation/socket/adapters/RoleSelectionEventAdapter';
import { GameCommandService } from '../../../../src/application/services/GameCommandService';
import { GameQueryService } from '../../../../src/application/services/GameQueryService';
import { UseCaseResponse } from '../../../../src/application/dto/common/BaseResponse';

describe('RoleSelectionEventAdapter', () => {
  let adapter: RoleSelectionEventAdapter;
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
      selectRole: jest.fn(),
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
    adapter = new RoleSelectionEventAdapter(
      mockIo,
      mockCommandService,
      mockQueryService,
      playerRooms
    );
  });

  describe('register', () => {
    it('SELECT_ROLE 이벤트 핸들러가 등록되어야 한다', () => {
      adapter.register(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('selectRole', expect.any(Function));
    });
  });

  describe('SELECT_ROLE 이벤트', () => {
    let selectRoleHandler: Function;

    beforeEach(() => {
      adapter.register(mockSocket);
      const onCalls = mockSocket.on.mock.calls;
      const selectRoleCall = onCalls.find((call: any) => call[0] === 'selectRole');
      selectRoleHandler = selectRoleCall![1];
    });

    it('성공 시 역할을 선택하고 게임 상태를 브로드캐스트해야 한다', async () => {
      const mockGameState = {
        roomId: 'room-123',
        phase: 'roleSelection',
        players: [
          { id: 'socket-123', selectedRole: 1 },
          { id: 'socket-456', selectedRole: null },
        ],
      };

      mockCommandService.selectRole.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await selectRoleHandler({ roomId: 'room-123', roleNumber: 1 }, callback);

      expect(mockCommandService.selectRole).toHaveBeenCalledWith('room-123', 'socket-123', 1);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
      expect(mockIo.to).toHaveBeenCalledWith('room-123');
      expect(mockIo.emit).toHaveBeenCalledWith('GAME_STATE_UPDATED', { game: mockGameState });
    });

    it('실패 시 에러를 반환해야 한다', async () => {
      mockCommandService.selectRole.mockResolvedValue({
        success: false,
        error: { message: 'Role already selected' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await selectRoleHandler({ roomId: 'room-123', roleNumber: 1 }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Role already selected',
      });
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it('유효하지 않은 역할 번호를 처리해야 한다', async () => {
      mockCommandService.selectRole.mockResolvedValue({
        success: false,
        error: { message: 'Invalid role number' },
      } as UseCaseResponse<any>);

      const callback = jest.fn();
      await selectRoleHandler({ roomId: 'room-123', roleNumber: 14 }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid role number',
      });
    });

    it('모든 플레이어가 역할을 선택하면 다음 페이즈로 진행해야 한다', async () => {
      const mockGameState = {
        roomId: 'room-123',
        phase: 'roleSelectionComplete',
        players: [
          { id: 'socket-123', selectedRole: 1, rank: 1 },
          { id: 'socket-456', selectedRole: 2, rank: 2 },
        ],
      };

      mockCommandService.selectRole.mockResolvedValue({
        success: true,
        data: mockGameState,
      } as UseCaseResponse<any>);

      mockQueryService.getGameState.mockResolvedValue(mockGameState as any);

      const callback = jest.fn();
      await selectRoleHandler({ roomId: 'room-123', roleNumber: 1 }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: mockGameState,
      });
      expect(mockGameState.phase).toBe('roleSelectionComplete');
    });
  });
});
