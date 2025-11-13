/**
 * GameValidator.test.ts
 *
 * GameValidator 헬퍼 함수들의 단위 테스트
 */

import {
  validateGameExists,
  validatePhase,
  validatePhases,
  validatePlayer,
  validateTurn,
  validateNotPassed,
  validateNotFinished,
  validateSameRank,
  validateCardsStrongerThanLast,
  validateCardCount,
  validatePlayerHasCards,
  validateMinPlayers,
  validateMaxPlayers,
  validateAllPlayersReady,
  validateRoleNumber,
  validateDeckIndex,
  validateDeckNotSelected,
} from '../../game/helpers/GameValidator';
import { ErrorCode } from '../../game/types/GameResult';
import { Game, Player, Card } from '../../types';
import { createCard, createMinimalGame } from './testHelpers';

describe('GameValidator', () => {
  // 테스트용 기본 게임 상태
  const createTestGame = (): Game =>
    createMinimalGame({
      players: [
        {
          id: 'player1',
          nickname: 'Player1',
          cards: [createCard(1), createCard(2), createCard(3)],
          isReady: true,
          isPassed: false,
          role: 1,
          rank: 1,
        },
        {
          id: 'player2',
          nickname: 'Player2',
          cards: [createCard(4), createCard(5)],
          isReady: true,
          isPassed: false,
          role: 2,
          rank: 2,
        },
        {
          id: 'player3',
          nickname: 'Player3',
          cards: [createCard(6)],
          isReady: false,
          isPassed: true,
          role: 3,
          rank: 3,
        },
      ],
      phase: 'playing',
      currentTurn: 'player1',
    });

  describe('validateGameExists', () => {
    it('게임이 존재하면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateGameExists(game);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(game);
      }
    });

    it('게임이 null이면 에러를 반환해야 함', () => {
      const result = validateGameExists(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.GAME_NOT_FOUND);
      }
    });
  });

  describe('validatePhase', () => {
    it('페이즈가 일치하면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePhase(game, 'playing', '카드 내기');
      expect(result.success).toBe(true);
    });

    it('페이즈가 다르면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePhase(game, 'waiting', '카드 내기');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.WRONG_PHASE_FOR_ACTION);
        expect(result.error).toContain('waiting');
      }
    });
  });

  describe('validatePhases', () => {
    it('페이즈가 허용 목록에 있으면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePhases(game, ['playing', 'waiting'], '액션');
      expect(result.success).toBe(true);
    });

    it('페이즈가 허용 목록에 없으면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePhases(game, ['waiting', 'roleSelection'], '액션');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.WRONG_PHASE_FOR_ACTION);
      }
    });
  });

  describe('validatePlayer', () => {
    it('플레이어가 존재하면 플레이어 객체를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePlayer(game, 'player1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('player1');
      }
    });

    it('플레이어가 없으면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validatePlayer(game, 'nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.PLAYER_NOT_FOUND);
      }
    });
  });

  describe('validateTurn', () => {
    it('플레이어의 턴이면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateTurn(game, 'player1');
      expect(result.success).toBe(true);
    });

    it('플레이어의 턴이 아니면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateTurn(game, 'player2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.NOT_YOUR_TURN);
      }
    });
  });

  describe('validateNotPassed', () => {
    it('패스하지 않았으면 성공 결과를 반환해야 함', () => {
      const player = createTestGame().players[0];
      const result = validateNotPassed(player);
      expect(result.success).toBe(true);
    });

    it('이미 패스했으면 에러를 반환해야 함', () => {
      const player = createTestGame().players[2]; // player3는 isPassed: true
      const result = validateNotPassed(player);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.TURN_ALREADY_PASSED);
      }
    });
  });

  describe('validateNotFinished', () => {
    it('게임 완료하지 않았으면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateNotFinished(game, 'player1');
      expect(result.success).toBe(true);
    });

    it('이미 게임 완료했으면 에러를 반환해야 함', () => {
      const game = createTestGame();
      game.finishedPlayers = ['player1'];
      const result = validateNotFinished(game, 'player1');
      expect(result.success).toBe(false);
    });
  });

  describe('validateSameRank', () => {
    it('모든 카드가 같은 숫자면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(5), createCard(5), createCard(5)];
      const result = validateSameRank(cards);
      expect(result.success).toBe(true);
    });

    it('조커와 같은 숫자 조합이면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(5), createCard(5, true)];
      const result = validateSameRank(cards);
      expect(result.success).toBe(true);
    });

    it('모두 조커면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(13, true), createCard(13, true)];
      const result = validateSameRank(cards);
      expect(result.success).toBe(true);
    });

    it('다른 숫자가 섞여있으면 에러를 반환해야 함', () => {
      const cards = [createCard(5), createCard(6)];
      const result = validateSameRank(cards);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.CARDS_NOT_SAME_RANK);
      }
    });
  });

  describe('validateCardsStrongerThanLast', () => {
    it('이전 플레이가 없으면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(5)];
      const result = validateCardsStrongerThanLast(cards, undefined);
      expect(result.success).toBe(true);
    });

    it('카드가 이전 플레이보다 낮으면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(3)];
      const lastPlay = { playerId: 'player2', cards: [createCard(5)] };
      const result = validateCardsStrongerThanLast(cards, lastPlay);
      expect(result.success).toBe(true);
    });

    it('조커만 내면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(13, true)];
      const lastPlay = { playerId: 'player2', cards: [createCard(1)] };
      const result = validateCardsStrongerThanLast(cards, lastPlay);
      expect(result.success).toBe(true);
    });

    it('카드가 이전 플레이보다 높거나 같으면 에러를 반환해야 함', () => {
      const cards = [createCard(6)];
      const lastPlay = { playerId: 'player2', cards: [createCard(5)] };
      const result = validateCardsStrongerThanLast(cards, lastPlay);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.CARDS_TOO_WEAK);
      }
    });
  });

  describe('validateCardCount', () => {
    it('이전 플레이가 없으면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(5), createCard(5)];
      const result = validateCardCount(cards, undefined);
      expect(result.success).toBe(true);
    });

    it('카드 개수가 같으면 성공 결과를 반환해야 함', () => {
      const cards = [createCard(3), createCard(3)];
      const lastPlay = { playerId: 'player2', cards: [createCard(5), createCard(5)] };
      const result = validateCardCount(cards, lastPlay);
      expect(result.success).toBe(true);
    });

    it('카드 개수가 다르면 에러를 반환해야 함', () => {
      const cards = [createCard(3)];
      const lastPlay = { playerId: 'player2', cards: [createCard(5), createCard(5)] };
      const result = validateCardCount(cards, lastPlay);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.INVALID_CARD_COUNT);
      }
    });
  });

  describe('validatePlayerHasCards', () => {
    it('플레이어가 모든 카드를 가지고 있으면 성공 결과를 반환해야 함', () => {
      const player = createTestGame().players[0];
      const cards = [createCard(1), createCard(2)];
      const result = validatePlayerHasCards(player, cards);
      expect(result.success).toBe(true);
    });

    it('플레이어가 카드를 가지고 있지 않으면 에러를 반환해야 함', () => {
      const player = createTestGame().players[0];
      const cards = [createCard(10)];
      const result = validatePlayerHasCards(player, cards);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.CARD_NOT_IN_HAND);
      }
    });

    it('플레이어가 중복된 카드를 가지고 있지 않은데 내려고 하면 에러를 반환해야 함', () => {
      const player = createTestGame().players[0];
      player.cards = [createCard(1), createCard(2)]; // hand: [1, 2]
      const cardsToPlay = [createCard(1), createCard(1)]; // try to play two 1s

      const result = validatePlayerHasCards(player, cardsToPlay);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.CARD_NOT_IN_HAND);
      }
    });
  });

  describe('validateMinPlayers', () => {
    it('플레이어 수가 최소값 이상이면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateMinPlayers(game, 3);
      expect(result.success).toBe(true);
    });

    it('플레이어 수가 최소값 미만이면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateMinPlayers(game, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.NOT_ENOUGH_PLAYERS);
      }
    });
  });

  describe('validateMaxPlayers', () => {
    it('플레이어 수가 최대값 미만이면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateMaxPlayers(game, 5);
      expect(result.success).toBe(true);
    });

    it('플레이어 수가 최대값 이상이면 에러를 반환해야 함', () => {
      const game = createTestGame();
      const result = validateMaxPlayers(game, 3);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.GAME_FULL);
      }
    });
  });

  describe('validateAllPlayersReady', () => {
    it('모든 플레이어가 준비 상태면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      game.players.forEach((p) => (p.isReady = true));
      const result = validateAllPlayersReady(game);
      expect(result.success).toBe(true);
    });

    it('준비하지 않은 플레이어가 있으면 에러를 반환해야 함', () => {
      const game = createTestGame(); // player3는 isReady: false
      const result = validateAllPlayersReady(game);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.PLAYER_NOT_READY);
      }
    });
  });

  describe('validateRoleNumber', () => {
    it('역할 번호가 1-13 범위면 성공 결과를 반환해야 함', () => {
      expect(validateRoleNumber(1).success).toBe(true);
      expect(validateRoleNumber(7).success).toBe(true);
      expect(validateRoleNumber(13).success).toBe(true);
    });

    it('역할 번호가 범위를 벗어나면 에러를 반환해야 함', () => {
      const result1 = validateRoleNumber(0);
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.code).toBe(ErrorCode.INVALID_ROLE_NUMBER);
      }

      const result2 = validateRoleNumber(14);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.code).toBe(ErrorCode.INVALID_ROLE_NUMBER);
      }
    });
  });

  describe('validateDeckIndex', () => {
    it('덱 인덱스가 유효하면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      game.selectableDecks = [
        { cards: [], isSelected: false },
        { cards: [], isSelected: false },
      ];
      expect(validateDeckIndex(game, 0).success).toBe(true);
      expect(validateDeckIndex(game, 1).success).toBe(true);
    });

    it('덱 인덱스가 유효하지 않으면 에러를 반환해야 함', () => {
      const game = createTestGame();
      game.selectableDecks = [{ cards: [], isSelected: false }];

      const result1 = validateDeckIndex(game, -1);
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.code).toBe(ErrorCode.INVALID_DECK_INDEX);
      }

      const result2 = validateDeckIndex(game, 1);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.code).toBe(ErrorCode.INVALID_DECK_INDEX);
      }
    });
  });

  describe('validateDeckNotSelected', () => {
    it('덱이 선택되지 않았으면 성공 결과를 반환해야 함', () => {
      const game = createTestGame();
      game.selectableDecks = [{ cards: [], isSelected: false }];
      const result = validateDeckNotSelected(game, 0);
      expect(result.success).toBe(true);
    });

    it('덱이 이미 선택되었으면 에러를 반환해야 함', () => {
      const game = createTestGame();
      game.selectableDecks = [{ cards: [], isSelected: true }];
      const result = validateDeckNotSelected(game, 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.DECK_ALREADY_SELECTED);
      }
    });
  });
});
