/**
 * PassTurnUseCase Unit Tests
 *
 * Repository를 Mock하여 Use Case 로직만 격리 테스트
 */

import { PassTurnUseCase } from '../../../../../src/application/use-cases/game/PassTurnUseCase';
import { IGameRepository } from '../../../../../src/application/ports/IGameRepository';
import { PassTurnRequest } from '../../../../../src/application/dto/game/PassTurnDto';
import { NotFoundError } from '../../../../../src/application/ports/RepositoryError';
import { Game } from '../../../../../src/domain/entities/Game';
import { Player } from '../../../../../src/domain/entities/Player';
import { Card } from '../../../../../src/domain/entities/Card';
import { RoomId } from '../../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../../src/domain/value-objects/PlayerId';

describe('PassTurnUseCase', () => {
  let useCase: PassTurnUseCase;
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

    useCase = new PassTurnUseCase(mockRepository);
  });

  describe('성공 케이스', () => {
    it('should pass turn successfully', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM01');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');

      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');
      player1.assignRank(1);
      player2.assignRank(2);
      player1.assignCards([Card.create(5)]);
      player2.assignCards([Card.create(6)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.changePhase('playing');
      game.setCurrentTurn(player1Id);

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM01',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.roomId).toBe('ROOM01');
        expect(response.data.playerId).toBe('player1');
        expect(response.data.nextTurn).toBe('player2');
        expect(response.data.allPlayersPassed).toBe(false);
      }
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(player1.isPassed).toBe(true);
    });

    it('should calculate next turn correctly', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM02');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');
      const player3Id = PlayerId.create('player3');

      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');
      const player3 = Player.create(player3Id, 'Player 3');
      player1.assignRank(1);
      player2.assignRank(2);
      player3.assignRank(3);
      player1.assignCards([Card.create(5)]);
      player2.assignCards([Card.create(6)]);
      player3.assignCards([Card.create(7)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.changePhase('playing');
      game.setCurrentTurn(player1Id);

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM02',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.nextTurn).toBe('player2');
      }
    });

    it('should detect when all players passed', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM03');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');

      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');
      player1.assignRank(1);
      player2.assignRank(2);
      player1.assignCards([Card.create(5)]);
      player2.assignCards([Card.create(6)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.changePhase('playing');
      game.setCurrentTurn(player2Id);
      game.setLastPlay({ playerId: player1Id, cards: [Card.create(3)] });

      // Player 1 already passed
      player1.pass();

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM03',
        playerId: 'player2',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.allPlayersPassed).toBe(true);
      }
    });

    it('should start new round when all players passed', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM04');
      const player1Id = PlayerId.create('player1');
      const player2Id = PlayerId.create('player2');

      const player1 = Player.create(player1Id, 'Player 1');
      const player2 = Player.create(player2Id, 'Player 2');
      player1.assignRank(1);
      player2.assignRank(2);
      player1.assignCards([Card.create(5)]);
      player2.assignCards([Card.create(6)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.changePhase('playing');
      game.setCurrentTurn(player2Id);
      game.setLastPlay({ playerId: player1Id, cards: [Card.create(3)] });

      // Player 1 already passed
      player1.pass();

      const initialRound = game.round;

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM04',
        playerId: 'player2',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(true);
      expect(game.round).toBe(initialRound + 1);
      expect(game.lastPlay).toBeUndefined();
      // Pass states should be reset
      expect(player1.isPassed).toBe(false);
      expect(player2.isPassed).toBe(false);
    });
  });

  describe('에러 케이스', () => {
    it('should return error when game not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request: PassTurnRequest = {
        roomId: 'ROOM99',
        playerId: 'player1',
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

    it('should return error when player not found', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM05');
      const player1Id = PlayerId.create('player1');

      const player1 = Player.create(player1Id, 'Player 1');
      const game = Game.create(roomId);
      game.addPlayer(player1);

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM05',
        playerId: 'nonexistent',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(response.error.message).toContain('Player not found');
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when roomId format is invalid', async () => {
      // Arrange
      const request: PassTurnRequest = {
        roomId: 'INVALID',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when repository fails', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM06');
      const player1Id = PlayerId.create('player1');

      const player1 = Player.create(player1Id, 'Player 1');
      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.changePhase('playing');
      game.setCurrentTurn(player1Id);
      player1.assignCards([Card.create(5)]);

      mockRepository.findById.mockResolvedValue(game);
      mockRepository.update.mockRejectedValue(new Error('Database connection failed'));

      const request: PassTurnRequest = {
        roomId: 'ROOM06',
        playerId: 'player1',
      };

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('PASS_TURN_FAILED');
        expect(response.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Response 구조', () => {
    it('should return response with timestamp', async () => {
      // Arrange
      const roomId = RoomId.from('ROOM07');
      const player1Id = PlayerId.create('player1');

      const player1 = Player.create(player1Id, 'Player 1');
      player1.assignRank(1);
      player1.assignCards([Card.create(5)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.changePhase('playing');
      game.setCurrentTurn(player1Id);

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM07',
        playerId: 'player1',
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
      const roomId = RoomId.from('ROOM08');
      const player1Id = PlayerId.create('player1');

      const player1 = Player.create(player1Id, 'Player 1');
      player1.assignRank(1);
      player1.assignCards([Card.create(5)]);

      const game = Game.create(roomId);
      game.addPlayer(player1);
      game.changePhase('playing');
      game.setCurrentTurn(player1Id);

      mockRepository.findById.mockResolvedValue(game);

      const request: PassTurnRequest = {
        roomId: 'ROOM08',
        playerId: 'player1',
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
        expect(response.data).toHaveProperty('nextTurn');
        expect(response.data).toHaveProperty('allPlayersPassed');
      }
    });

    it('should include all required fields in error response', async () => {
      // Arrange
      const request: PassTurnRequest = {
        roomId: 'BAD',
        playerId: 'player1',
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
