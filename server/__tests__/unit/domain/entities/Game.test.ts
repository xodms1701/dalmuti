/**
 * Game Entity Unit Tests
 */

import { Game } from '../../../../src/domain/entities/Game';
import { Player } from '../../../../src/domain/entities/Player';
import { Card } from '../../../../src/domain/entities/Card';
import { RoomId } from '../../../../src/domain/value-objects/RoomId';
import { PlayerId } from '../../../../src/domain/value-objects/PlayerId';

describe('Game', () => {
  describe('create', () => {
    it('should create a game with valid room id', () => {
      // Arrange & Act
      const roomId = RoomId.from('ROOM01');
      const game = Game.create(roomId, PlayerId.create('owner1'));

      // Assert
      expect(game.roomId.value).toBe('ROOM01');
      expect(game.players).toEqual([]);
      expect(game.phase).toBe('waiting');
      expect(game.currentTurn).toBeNull();
      expect(game.lastPlay).toBeUndefined();
      expect(game.deck).toEqual([]);
      expect(game.round).toBe(0);
      expect(game.finishedPlayers).toEqual([]);
    });

    it('should throw error when room id is empty', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('')).toThrow();
    });

    it('should throw error when room id is only whitespace', () => {
      // Arrange & Act & Assert
      expect(() => RoomId.from('   ')).toThrow();
    });
  });

  describe('addPlayer', () => {
    it('should add a player to the game', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');

      // Act
      game.addPlayer(player);

      // Assert
      expect(game.players).toHaveLength(1);
      expect(game.players[0].id.value).toBe('player1');
    });

    it('should add multiple players', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');

      // Act
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Assert
      expect(game.players).toHaveLength(2);
    });

    it('should throw error when adding duplicate player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);

      // Act & Assert
      expect(() => game.addPlayer(player)).toThrow('Player already exists in the game');
    });
  });

  describe('removePlayer', () => {
    it('should remove a player from the game', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);

      // Act
      game.removePlayer(PlayerId.create('player1'));

      // Assert
      expect(game.players).toHaveLength(0);
    });

    it('should throw error when removing non-existent player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act & Assert
      expect(() => game.removePlayer(PlayerId.create('player1'))).toThrow('Player not found');
    });

    it('should only remove specified player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      game.removePlayer(PlayerId.create('player1'));

      // Assert
      expect(game.players).toHaveLength(1);
      expect(game.players[0].id.value).toBe('player2');
    });
  });

  describe('getPlayer', () => {
    it('should return player when found', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);

      // Act
      const found = game.getPlayer(PlayerId.create('player1'));

      // Assert
      expect(found).toBeDefined();
      expect(found?.id.value).toBe('player1');
    });

    it('should return undefined when player not found', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      const found = game.getPlayer(PlayerId.create('player1'));

      // Assert
      expect(found).toBeUndefined();
    });
  });

  describe('canPlayCard', () => {
    it('should return false when game is not in playing phase', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when cards array is empty', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), []);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when not player turn', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player2'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when player has finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when player has passed', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      player.pass();
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when all conditions are met', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when card count does not match lastPlay', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));
      game.setLastPlay({
        playerId: PlayerId.create('player2'),
        cards: [Card.create(7, false), Card.create(7, false)],
      });

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(5, false)]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when cards are weaker than lastPlay', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));
      game.setLastPlay({
        playerId: PlayerId.create('player2'),
        cards: [Card.create(3, false)],
      });

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(7, false)]);

      // Assert
      expect(result).toBe(false); // 7 is weaker than 3
    });

    it('should return true when cards are stronger than lastPlay', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');
      game.setCurrentTurn(PlayerId.create('player1'));
      game.setLastPlay({
        playerId: PlayerId.create('player2'),
        cards: [Card.create(7, false)],
      });

      // Act
      const result = game.canPlayCard(PlayerId.create('player1'), [Card.create(3, false)]);

      // Assert
      expect(result).toBe(true); // 3 is stronger than 7
    });
  });

  describe('isGameOver', () => {
    it('should return true when only one active player remains', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const result = game.isGameOver();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when no active players remain', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player1);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const result = game.isGameOver();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when multiple active players remain', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const result = game.isGameOver();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when all players are active', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const result = game.isGameOver();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isPlayerTurn', () => {
    it('should return true when it is player turn', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      game.setCurrentTurn(PlayerId.create('player1'));

      // Act
      const result = game.isPlayerTurn(PlayerId.create('player1'));

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when it is not player turn', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      game.setCurrentTurn(PlayerId.create('player2'));

      // Act
      const result = game.isPlayerTurn(PlayerId.create('player1'));

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when current turn is null', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      const result = game.isPlayerTurn(PlayerId.create('player1'));

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getActivePlayerCount', () => {
    it('should return count of active players', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      const player3 = Player.create(PlayerId.create('player3'), 'Charlie');
      game.addPlayer(player1);
      game.addPlayer(player2);
      game.addPlayer(player3);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const count = game.getActivePlayerCount();

      // Assert
      expect(count).toBe(2);
    });

    it('should return 0 when all players are finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player1);
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const count = game.getActivePlayerCount();

      // Assert
      expect(count).toBe(0);
    });

    it('should return total count when no players are finished', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player1 = Player.create(PlayerId.create('player1'), 'Alice');
      const player2 = Player.create(PlayerId.create('player2'), 'Bob');
      game.addPlayer(player1);
      game.addPlayer(player2);

      // Act
      const count = game.getActivePlayerCount();

      // Assert
      expect(count).toBe(2);
    });
  });

  describe('state management', () => {
    it('should change phase', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      game.changePhase('playing');

      // Assert
      expect(game.phase).toBe('playing');
    });

    it('should set current turn', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      game.setCurrentTurn(PlayerId.create('player1'));

      // Assert
      expect(game.currentTurn?.value).toBe('player1');
    });

    it('should set last play', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const lastPlay = {
        playerId: PlayerId.create('player1'),
        cards: [Card.create(5, false)],
      };

      // Act
      game.setLastPlay(lastPlay);

      // Assert
      expect(game.lastPlay?.playerId.value).toBe('player1');
      expect(game.lastPlay?.cards).toHaveLength(1);
      expect(game.lastPlay?.cards[0].rank).toBe(5);
    });

    it('should increment round', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      game.incrementRound();
      game.incrementRound();

      // Assert
      expect(game.round).toBe(2);
    });

    it('should add finished player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Assert
      expect(game.finishedPlayers.some((p) => p.value === 'player1')).toBe(true);
    });

    it('should not add duplicate finished player', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));

      // Act
      game.addFinishedPlayer(PlayerId.create('player1'));
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Assert
      expect(game.finishedPlayers).toHaveLength(1);
    });

    it('should set deck', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const deck = [Card.create(5, false)];

      // Act
      game.setDeck(deck);

      // Assert
      expect(game.deck).toHaveLength(1);
      expect(game.deck[0].rank).toBe(5);
    });

    it('should set selectable decks', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const decks = [{ cards: [], isSelected: false }];

      // Act
      game.setSelectableDecks(decks);

      // Assert
      expect(game.selectableDecks).toEqual(decks);
    });

    it('should set role selection cards', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const cards = [{ number: 1, isSelected: false }];

      // Act
      game.setRoleSelectionDeck(cards);

      // Assert
      expect(game.roleSelectionDeck).toEqual(cards);
    });
  });

  describe('toPlainObject / fromPlainObject', () => {
    it('should convert game to plain object', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);
      game.changePhase('playing');

      // Act
      const plain = game.toPlainObject();

      // Assert
      expect(plain.roomId).toBe('ROOM01');
      expect(plain.players).toHaveLength(1);
      expect(plain.phase).toBe('playing');
    });

    it('should create game from plain object', () => {
      // Arrange
      const plain = {
        roomId: 'ROOM01',
        ownerId: 'owner1',
        players: [
          {
            id: 'player1',
            nickname: 'Alice',
            cards: [],
            role: null,
            rank: null,
            isPassed: false,
            isReady: false,
          },
        ],
        phase: 'playing',
        currentTurn: 'player1',
        lastPlay: undefined,
        deck: [],
        round: 1,
        finishedPlayers: [],
      };

      // Act
      const game = Game.fromPlainObject(plain);

      // Assert
      expect(game.roomId.value).toBe('ROOM01');
      expect(game.players).toHaveLength(1);
      expect(game.phase).toBe('playing');
      expect(game.round).toBe(1);
    });

    it('should handle minimal plain object', () => {
      // Arrange
      const plain = { roomId: 'ROOM01', ownerId: 'owner1' };

      // Act
      const game = Game.fromPlainObject(plain);

      // Assert
      expect(game.roomId.value).toBe('ROOM01');
      expect(game.players).toEqual([]);
      expect(game.phase).toBe('waiting');
    });
  });

  describe('immutability', () => {
    it('should return a copy of players array', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      const player = Player.create(PlayerId.create('player1'), 'Alice');
      game.addPlayer(player);

      // Act
      const { players } = game;
      players.push(Player.create(PlayerId.create('player2'), 'Bob'));

      // Assert
      expect(game.players).toHaveLength(1);
    });

    it('should return a copy of deck array', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      game.setDeck([Card.create(5, false)]);

      // Act
      const { deck } = game;
      deck.push(Card.create(7, false));

      // Assert
      expect(game.deck).toHaveLength(1);
    });

    it('should return a copy of finished players array', () => {
      // Arrange
      const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
      game.addFinishedPlayer(PlayerId.create('player1'));

      // Act
      const finished = game.finishedPlayers;
      finished.push(PlayerId.create('player2'));

      // Assert
      expect(game.finishedPlayers).toHaveLength(1);
    });
  });

  describe('vote management', () => {
    describe('registerVote', () => {
      it('should register vote for player', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId = PlayerId.create('player1');
        const player = Player.create(playerId, 'Alice');
        game.addPlayer(player);

        // Act
        game.registerVote(playerId, true);
        const result = game.getVoteResult();

        // Assert
        expect(result.approvalCount).toBe(1);
        expect(result.rejectionCount).toBe(0);
      });

      it('should register rejection vote', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId = PlayerId.create('player1');
        const player = Player.create(playerId, 'Alice');
        game.addPlayer(player);

        // Act
        game.registerVote(playerId, false);
        const result = game.getVoteResult();

        // Assert
        expect(result.approvalCount).toBe(0);
        expect(result.rejectionCount).toBe(1);
      });

      it('should throw error when player not found', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId = PlayerId.create('nonexistent');

        // Act & Assert
        expect(() => game.registerVote(playerId, true)).toThrow('Player not found in game');
      });
    });

    describe('getVoteResult', () => {
      it('should return all voted when all players voted', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId1 = PlayerId.create('player1');
        const playerId2 = PlayerId.create('player2');
        const player1 = Player.create(playerId1, 'Alice');
        const player2 = Player.create(playerId2, 'Bob');
        game.addPlayer(player1);
        game.addPlayer(player2);
        game.registerVote(playerId1, true);
        game.registerVote(playerId2, true);

        // Act
        const result = game.getVoteResult();

        // Assert
        expect(result.allVoted).toBe(true);
        expect(result.approved).toBe(true);
        expect(result.approvalCount).toBe(2);
        expect(result.rejectionCount).toBe(0);
      });

      it('should return not approved when one player rejects', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId1 = PlayerId.create('player1');
        const playerId2 = PlayerId.create('player2');
        const player1 = Player.create(playerId1, 'Alice');
        const player2 = Player.create(playerId2, 'Bob');
        game.addPlayer(player1);
        game.addPlayer(player2);
        game.registerVote(playerId1, true);
        game.registerVote(playerId2, false);

        // Act
        const result = game.getVoteResult();

        // Assert
        expect(result.allVoted).toBe(true);
        expect(result.approved).toBe(false);
        expect(result.approvalCount).toBe(1);
        expect(result.rejectionCount).toBe(1);
      });

      it('should return not all voted when some players have not voted', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const playerId1 = PlayerId.create('player1');
        const playerId2 = PlayerId.create('player2');
        const player1 = Player.create(playerId1, 'Alice');
        const player2 = Player.create(playerId2, 'Bob');
        game.addPlayer(player1);
        game.addPlayer(player2);
        game.registerVote(playerId1, true);

        // Act
        const result = game.getVoteResult();

        // Assert
        expect(result.allVoted).toBe(false);
        expect(result.approved).toBe(false);
      });
    });

    describe('startNextGame', () => {
      it('should increment round and reset game state', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        const player1 = Player.create(PlayerId.create('player1'), 'Alice');
        const player2 = Player.create(PlayerId.create('player2'), 'Bob');
        player1.ready();
        player2.ready();
        game.addPlayer(player1);
        game.addPlayer(player2);
        game.registerVote(PlayerId.create('player1'), true);
        game.registerVote(PlayerId.create('player2'), true);
        game.changePhase('voting');

        // 이전 게임의 taxExchanges와 revolutionStatus 설정
        game['_taxExchanges'] = [
          {
            fromPlayerId: 'player1',
            toPlayerId: 'player2',
            cardCount: 2,
            cardsGiven: [],
          },
        ];
        game['_revolutionStatus'] = {
          isRevolution: true,
          isGreatRevolution: false,
          revolutionPlayerId: 'player1',
        };

        // Act
        game.startNextGame();

        // Assert
        expect(game.round).toBe(1);
        expect(game.phase).toBe('roleSelectionComplete'); // 순위 확인 화면으로 먼저 전환
        expect(game.currentTurn).toBeNull();
        expect(game.lastPlay).toBeUndefined();
        expect(game.finishedPlayers).toEqual([]);
        expect(player1.isReady).toBe(false);
        expect(player2.isReady).toBe(false);

        // 세금 교환 정보 및 혁명 상태 초기화 확인
        expect(game.taxExchanges).toBeUndefined();
        expect(game.revolutionStatus).toBeUndefined();

        const voteResult = game.getVoteResult();
        expect(voteResult.approvalCount).toBe(0);
        expect(voteResult.rejectionCount).toBe(0);
      });
    });

    describe('endGame', () => {
      it('should change phase to gameEnd', () => {
        // Arrange
        const game = Game.create(RoomId.from('ROOM01'), PlayerId.create('owner1'));
        game.changePhase('playing');

        // Act
        game.endGame();

        // Assert
        expect(game.phase).toBe('gameEnd');
      });
    });
  });
});
