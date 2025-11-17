/**
 * SelectRoleUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { SelectRoleUseCase } from '../../../../../src/application/use-cases/game/SelectRoleUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { SelectRoleRequest } from '../../../../../src/application/dto/game/SelectRoleDto';
import { NotFoundError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { Card } from '../../../../../src/domain/entities/Card';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('SelectRoleUseCase', () => {
  let useCase: SelectRoleUseCase;
  let mockRepository: jest.Mocked<IGameRepository>;

  beforeEach(() => {
    // Repository Mock 생성
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };

    useCase = new SelectRoleUseCase(mockRepository);
  });

  // 테스트용 게임 생성 헬퍼
  const createTestGame = (
    roomId: string,
    playerCount: number = 4,
    phase: string = 'roleSelection'
  ): Game => {
    const game = Game.create(RoomId.from(roomId), PlayerId.create('owner1'));

    // 플레이어 추가
    for (let i = 1; i <= playerCount; i++) {
      const player = Player.create(PlayerId.create(`player${i}`), `Player${i}`);
      game.addPlayer(player);
    }

    // 페이즈 설정
    game.changePhase(phase);

    // 역할 선택 카드 설정 (1-13)
    const roleSelectionCards = [];
    for (let i = 1; i <= 13; i++) {
      roleSelectionCards.push({
        number: i,
        isSelected: false,
        selectedBy: undefined,
      });
    }
    game.setRoleSelectionCards(roleSelectionCards);

    return game;
  };

  describe('성공 케이스', () => {
    it('should select role successfully', async () => {
      // Arrange
      const game = createTestGame('ROOM01', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.selectedRole).toBe(5);
        expect(response.data.allRolesSelected).toBe(false);
      }
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return allRolesSelected=true when all players selected roles', async () => {
      // Arrange
      const game = createTestGame('ROOM02', 4);

      // 덱 초기화 (allRolesSelected일 때 덱이 필요함)
      const deckCards = [];
      for (let rank = 1; rank <= 13; rank++) {
        for (let i = 0; i < 4; i++) {
          deckCards.push(Card.create(rank, false));
        }
      }
      // 조커 2장 추가 (rank는 13)
      deckCards.push(Card.create(13, true));
      deckCards.push(Card.create(13, true));
      game.setDeck(deckCards);

      // 3명의 플레이어가 이미 역할을 선택한 상태
      const player1 = game.getPlayer(PlayerId.create('player1'))!;
      player1.assignRole(1);
      game.roleSelectionCards![0].isSelected = true;
      game.roleSelectionCards![0].selectedBy = 'player1';

      const player2 = game.getPlayer(PlayerId.create('player2'))!;
      player2.assignRole(2);
      game.roleSelectionCards![1].isSelected = true;
      game.roleSelectionCards![1].selectedBy = 'player2';

      const player3 = game.getPlayer(PlayerId.create('player3'))!;
      player3.assignRole(3);
      game.roleSelectionCards![2].isSelected = true;
      game.roleSelectionCards![2].selectedBy = 'player3';

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM02',
        playerId: 'player4',
        roleNumber: 4,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.allRolesSelected).toBe(true);
      }
    });

    it('should call repository.update with updated game', async () => {
      // Arrange
      const game = createTestGame('ROOM03', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM03',
        playerId: 'player1',
        roleNumber: 7,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ _value: 'ROOM03' }),
        expect.objectContaining({
          roomId: expect.objectContaining({ _value: 'ROOM03' }),
        })
      );
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: SelectRoleRequest = {
        roomId: 'NOTF01',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(response.error.message).toContain('Game not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // NOTE: Repository.findById는 null을 반환하지 NotFoundError를 던지지 않음
    // 이 케이스는 "should return error when game not found" 테스트로 커버됨

    it('should return error when role is already selected', async () => {
      // Arrange
      const game = createTestGame('ROOM04', 4);

      // 역할 5를 이미 선택된 상태로 설정
      game.roleSelectionCards![4].isSelected = true;
      game.roleSelectionCards![4].selectedBy = 'player2';

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM04',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('SELECT_ROLE_FAILED');
        expect(response.error.message).toContain('already been selected');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when player already selected a role', async () => {
      // Arrange
      const game = createTestGame('ROOM05', 4);

      // player1이 이미 역할을 선택한 상태
      const player1 = game.getPlayer(PlayerId.create('player1'))!;
      player1.assignRole(3);
      game.roleSelectionCards![2].isSelected = true;
      game.roleSelectionCards![2].selectedBy = 'player1';

      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM05',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('SELECT_ROLE_FAILED');
        expect(response.error.message).toContain('already selected');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when roleNumber is out of range (too low)', async () => {
      // Arrange
      const request: SelectRoleRequest = {
        roomId: 'ROOM06',
        playerId: 'player1',
        roleNumber: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('between 1 and 13');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when roleNumber is out of range (too high)', async () => {
      // Arrange
      const request: SelectRoleRequest = {
        roomId: 'ROOM07',
        playerId: 'player1',
        roleNumber: 14,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toContain('between 1 and 13');
      }
    });

    it('should return error when roomId format is invalid', async () => {
      // Arrange
      const request: SelectRoleRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect((response.error.details as { field?: string })?.field).toBe('roomId');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when playerId is empty', async () => {
      // Arrange
      const request: SelectRoleRequest = {
        roomId: 'ROOM08',
        playerId: '',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect((response.error.details as { field?: string })?.field).toBe('playerId');
      }
    });

    it('should return error when game is not in roleSelection phase', async () => {
      // Arrange
      const game = createTestGame('ROOM09', 4, 'waiting');
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'ROOM09',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('SELECT_ROLE_FAILED');
        expect(response.error.message).toContain('not in roleSelection phase');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when repository.update fails', async () => {
      // Arrange
      const game = createTestGame('ROOM10', 4);
      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      const request: SelectRoleRequest = {
        roomId: 'ROOM10',
        playerId: 'player1',
        roleNumber: 5,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('UPDATE_GAME_FAILED');
        expect(response.error.message).toContain('Failed to update game state');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const game = createTestGame('RESP01', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'RESP01',
        playerId: 'player1',
        roleNumber: 5,
      };

      const beforeTime = new Date();

      // Act
      const response = await useCase.execute(request);

      // Assert
      const afterTime = new Date();
      expect(response.timestamp).toBeInstanceOf(Date);
      expect(response.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(response.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should include all required fields in success response', async () => {
      // Arrange
      const game = createTestGame('RESP02', 4);
      mockRepository.findById.mockResolvedValue(game);

      const request: SelectRoleRequest = {
        roomId: 'RESP02',
        playerId: 'player1',
        roleNumber: 7,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (response.success) {
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('roomId');
        expect(response.data).toHaveProperty('playerId');
        expect(response.data).toHaveProperty('selectedRole');
        expect(response.data).toHaveProperty('allRolesSelected');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: SelectRoleRequest = {
        roomId: 'RESP03',
        playerId: 'player1',
        roleNumber: 0,
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('timestamp');
      if (!response.success) {
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
      }
    });
  });
});
