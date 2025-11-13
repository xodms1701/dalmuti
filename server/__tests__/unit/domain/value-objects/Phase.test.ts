/**
 * Phase Value Object Unit Tests
 */

import { Phase } from '../../../../src/domain/value-objects/Phase';

describe('Phase', () => {
  describe('static constants', () => {
    it('should have WAITING constant', () => {
      // Assert
      expect(Phase.WAITING).toBeDefined();
      expect(Phase.WAITING.value).toBe('waiting');
    });

    it('should have ROLE_SELECTION constant', () => {
      // Assert
      expect(Phase.ROLE_SELECTION).toBeDefined();
      expect(Phase.ROLE_SELECTION.value).toBe('roleSelection');
    });

    it('should have ROLE_SELECTION_COMPLETE constant', () => {
      // Assert
      expect(Phase.ROLE_SELECTION_COMPLETE).toBeDefined();
      expect(Phase.ROLE_SELECTION_COMPLETE.value).toBe('roleSelectionComplete');
    });

    it('should have CARD_SELECTION constant', () => {
      // Assert
      expect(Phase.CARD_SELECTION).toBeDefined();
      expect(Phase.CARD_SELECTION.value).toBe('cardSelection');
    });

    it('should have PLAYING constant', () => {
      // Assert
      expect(Phase.PLAYING).toBeDefined();
      expect(Phase.PLAYING.value).toBe('playing');
    });

    it('should have GAME_END constant', () => {
      // Assert
      expect(Phase.GAME_END).toBeDefined();
      expect(Phase.GAME_END.value).toBe('gameEnd');
    });
  });

  describe('from', () => {
    it('should create Phase from valid waiting string', () => {
      // Arrange & Act
      const phase = Phase.from('waiting');

      // Assert
      expect(phase.value).toBe('waiting');
    });

    it('should create Phase from valid roleSelection string', () => {
      // Arrange & Act
      const phase = Phase.from('roleSelection');

      // Assert
      expect(phase.value).toBe('roleSelection');
    });

    it('should create Phase from valid roleSelectionComplete string', () => {
      // Arrange & Act
      const phase = Phase.from('roleSelectionComplete');

      // Assert
      expect(phase.value).toBe('roleSelectionComplete');
    });

    it('should create Phase from valid cardSelection string', () => {
      // Arrange & Act
      const phase = Phase.from('cardSelection');

      // Assert
      expect(phase.value).toBe('cardSelection');
    });

    it('should create Phase from valid playing string', () => {
      // Arrange & Act
      const phase = Phase.from('playing');

      // Assert
      expect(phase.value).toBe('playing');
    });

    it('should create Phase from valid gameEnd string', () => {
      // Arrange & Act
      const phase = Phase.from('gameEnd');

      // Assert
      expect(phase.value).toBe('gameEnd');
    });

    it('should throw error for invalid phase string', () => {
      // Arrange & Act & Assert
      expect(() => Phase.from('invalid')).toThrow('Invalid phase: invalid');
    });

    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => Phase.from('')).toThrow('Invalid phase: ');
    });

    it('should throw error for case-mismatched phase', () => {
      // Arrange & Act & Assert
      expect(() => Phase.from('WAITING')).toThrow('Invalid phase: WAITING');
    });
  });

  describe('canTransitionTo', () => {
    it('should allow transition from waiting to roleSelection', () => {
      // Arrange
      const current = Phase.WAITING;
      const next = Phase.ROLE_SELECTION;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from roleSelection to roleSelectionComplete', () => {
      // Arrange
      const current = Phase.ROLE_SELECTION;
      const next = Phase.ROLE_SELECTION_COMPLETE;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from roleSelectionComplete to cardSelection', () => {
      // Arrange
      const current = Phase.ROLE_SELECTION_COMPLETE;
      const next = Phase.CARD_SELECTION;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from cardSelection to playing', () => {
      // Arrange
      const current = Phase.CARD_SELECTION;
      const next = Phase.PLAYING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from playing to waiting', () => {
      // Arrange
      const current = Phase.PLAYING;
      const next = Phase.WAITING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from playing to gameEnd', () => {
      // Arrange
      const current = Phase.PLAYING;
      const next = Phase.GAME_END;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow transition from gameEnd to waiting', () => {
      // Arrange
      const current = Phase.GAME_END;
      const next = Phase.WAITING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });

    it('should not allow transition from waiting to playing', () => {
      // Arrange
      const current = Phase.WAITING;
      const next = Phase.PLAYING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow transition from waiting to cardSelection', () => {
      // Arrange
      const current = Phase.WAITING;
      const next = Phase.CARD_SELECTION;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow transition from roleSelection to playing', () => {
      // Arrange
      const current = Phase.ROLE_SELECTION;
      const next = Phase.PLAYING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow transition from cardSelection to waiting', () => {
      // Arrange
      const current = Phase.CARD_SELECTION;
      const next = Phase.WAITING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow transition from gameEnd to playing', () => {
      // Arrange
      const current = Phase.GAME_END;
      const next = Phase.PLAYING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow transition to same phase (waiting)', () => {
      // Arrange
      const current = Phase.WAITING;
      const next = Phase.WAITING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });

    it('should not allow backward transition from roleSelectionComplete to roleSelection', () => {
      // Arrange
      const current = Phase.ROLE_SELECTION_COMPLETE;
      const next = Phase.ROLE_SELECTION;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for Phase with same value', () => {
      // Arrange
      const phase1 = Phase.from('waiting');
      const phase2 = Phase.from('waiting');

      // Act
      const result = phase1.equals(phase2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for Phase with different value', () => {
      // Arrange
      const phase1 = Phase.from('waiting');
      const phase2 = Phase.from('playing');

      // Act
      const result = phase1.equals(phase2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when comparing static constant with from', () => {
      // Arrange
      const phase1 = Phase.WAITING;
      const phase2 = Phase.from('waiting');

      // Act
      const result = phase1.equals(phase2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when comparing with non-Phase object', () => {
      // Arrange
      const phase = Phase.WAITING;
      const notPhase = { value: 'waiting' };

      // Act
      const result = phase.equals(notPhase as any);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value for waiting', () => {
      // Arrange
      const phase = Phase.WAITING;

      // Act
      const result = phase.toString();

      // Assert
      expect(result).toBe('waiting');
    });

    it('should return the string value for playing', () => {
      // Arrange
      const phase = Phase.PLAYING;

      // Act
      const result = phase.toString();

      // Assert
      expect(result).toBe('playing');
    });

    it('should return the string value for roleSelection', () => {
      // Arrange
      const phase = Phase.ROLE_SELECTION;

      // Act
      const result = phase.toString();

      // Assert
      expect(result).toBe('roleSelection');
    });
  });

  describe('value getter', () => {
    it('should return the underlying value', () => {
      // Arrange
      const phase = Phase.WAITING;

      // Act
      const result = phase.value;

      // Assert
      expect(result).toBe('waiting');
    });
  });

  describe('phase transition flow', () => {
    it('should follow complete game flow', () => {
      // Arrange
      const phases = [
        Phase.WAITING,
        Phase.ROLE_SELECTION,
        Phase.ROLE_SELECTION_COMPLETE,
        Phase.CARD_SELECTION,
        Phase.PLAYING,
        Phase.GAME_END,
        Phase.WAITING,
      ];

      // Act & Assert
      for (let i = 0; i < phases.length - 1; i++) {
        const current = phases[i];
        const next = phases[i + 1];
        expect(current.canTransitionTo(next)).toBe(true);
      }
    });

    it('should allow playing to waiting for new game', () => {
      // Arrange
      const current = Phase.PLAYING;
      const next = Phase.WAITING;

      // Act
      const result = current.canTransitionTo(next);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should maintain value integrity', () => {
      // Arrange
      const phase = Phase.from('waiting');

      // Act
      const value1 = phase.value;
      const value2 = phase.toString();

      // Assert
      expect(value1).toBe('waiting');
      expect(value2).toBe('waiting');
      expect(value1).toBe(value2);
    });

    it('should always return same instance for static constants', () => {
      // Arrange & Act
      const waiting1 = Phase.WAITING;
      const waiting2 = Phase.WAITING;

      // Assert
      expect(waiting1).toBe(waiting2);
    });
  });
});
