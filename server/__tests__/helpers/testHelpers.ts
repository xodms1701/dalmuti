import GameManager from '../../game/GameManager';
import { Game, Card, Player } from '../../types';
import MockDatabase from '../mocks/MockDatabase';

/**
 * 게임을 생성하고 지정된 수의 플레이어를 추가합니다
 */
export async function setupGameWithPlayers(
  gameManager: GameManager,
  playerCount: number,
  ownerNickname: string = 'Owner'
): Promise<Game> {
  const ownerId = 'player1';
  const game = await gameManager.createGame(ownerId, ownerNickname);

  if (!game) {
    throw new Error('게임 생성 실패');
  }

  // 나머지 플레이어 추가 (player2부터)
  for (let i = 2; i <= playerCount; i++) {
    await gameManager.joinGame(game.roomId, `player${i}`, `Player${i}`);
  }

  return game;
}

/**
 * 플레이어 통계를 초기화합니다
 */
export function initializePlayerStats(players: Player[]): Record<string, any> {
  const stats: Record<string, any> = {};
  players.forEach((player) => {
    stats[player.id] = {
      nickname: player.nickname,
      totalCardsPlayed: 0,
      totalPasses: 0,
      finishedAtRound: 0,
    };
  });
  return stats;
}

/**
 * 게임 상태 빌더 클래스
 */
export class GameStateBuilder {
  private game: Game;
  private mockDb: MockDatabase;

  constructor(game: Game, mockDb: MockDatabase) {
    this.game = { ...game };
    this.mockDb = mockDb;
  }

  /**
   * 게임 페이즈를 설정합니다
   */
  withPhase(phase: Game['phase']): this {
    this.game.phase = phase;
    return this;
  }

  /**
   * 현재 턴을 설정합니다
   */
  withCurrentTurn(playerId: string): this {
    this.game.currentTurn = playerId;
    return this;
  }

  /**
   * 라운드를 설정합니다
   */
  withRound(round: number): this {
    this.game.round = round;
    return this;
  }

  /**
   * 마지막 플레이를 설정합니다
   */
  withLastPlay(playerId: string, cards: Card[]): this {
    this.game.lastPlay = { playerId, cards };
    return this;
  }

  /**
   * 마지막 플레이를 제거합니다
   */
  withoutLastPlay(): this {
    this.game.lastPlay = undefined;
    return this;
  }

  /**
   * 플레이어의 순위를 설정합니다
   */
  withPlayerRanks(ranks: number[]): this {
    ranks.forEach((rank, index) => {
      if (this.game.players[index]) {
        this.game.players[index].rank = rank;
      }
    });
    return this;
  }

  /**
   * 플레이어의 카드를 설정합니다
   */
  withPlayerCards(playerIndex: number, cards: Card[]): this {
    if (this.game.players[playerIndex]) {
      this.game.players[playerIndex].cards = cards;
    }
    return this;
  }

  /**
   * 모든 플레이어의 카드를 일괄 설정합니다
   */
  withAllPlayerCards(cardsByPlayer: Card[][]): this {
    cardsByPlayer.forEach((cards, index) => {
      if (this.game.players[index]) {
        this.game.players[index].cards = cards;
      }
    });
    return this;
  }

  /**
   * 플레이어의 isPassed 상태를 설정합니다
   */
  withPlayerPassed(playerIndex: number, isPassed: boolean): this {
    if (this.game.players[playerIndex]) {
      this.game.players[playerIndex].isPassed = isPassed;
    }
    return this;
  }

  /**
   * 완료된 플레이어 목록을 설정합니다
   */
  withFinishedPlayers(playerIds: string[]): this {
    this.game.finishedPlayers = playerIds;
    return this;
  }

  /**
   * 플레이어 통계를 초기화합니다
   */
  withInitializedStats(): this {
    this.game.playerStats = initializePlayerStats(this.game.players);
    return this;
  }

  /**
   * 투표 상태를 설정합니다
   */
  withVoting(isVoting: boolean): this {
    this.game.isVoting = isVoting;
    return this;
  }

  /**
   * 선택 가능한 덱을 설정합니다
   */
  withSelectableDecks(decks: Array<{ cards: Card[]; isSelected: boolean; selectedBy?: string }>): this {
    this.game.selectableDecks = decks;
    return this;
  }

  /**
   * 플레이어에게 더블 조커 플래그를 설정합니다
   */
  withDoubleJoker(playerIndex: number): this {
    if (this.game.players[playerIndex]) {
      this.game.players[playerIndex].hasDoubleJoker = true;
    }
    return this;
  }

  /**
   * 혁명 페이즈를 설정합니다
   */
  withRevolutionPhase(doubleJokerPlayerId: string): this {
    this.game.phase = 'revolution';
    this.game.currentTurn = doubleJokerPlayerId;
    const player = this.game.players.find((p) => p.id === doubleJokerPlayerId);
    if (player) {
      player.hasDoubleJoker = true;
    }
    return this;
  }

  /**
   * 빌드된 게임 상태를 데이터베이스에 저장하고 반환합니다
   */
  async build(): Promise<Game> {
    await this.mockDb.updateGame(this.game.roomId, this.game);
    const updatedGame = await this.mockDb.getGame(this.game.roomId);
    if (!updatedGame) {
      throw new Error('게임 상태 빌드 실패');
    }
    return updatedGame;
  }

  /**
   * 게임 상태를 반환합니다 (저장하지 않음)
   */
  getGame(): Game {
    return this.game;
  }
}

/**
 * 게임 상태 빌더를 생성합니다
 */
export function buildGameState(game: Game, mockDb: MockDatabase): GameStateBuilder {
  return new GameStateBuilder(game, mockDb);
}

/**
 * 간단한 카드 생성 헬퍼
 */
export function createCard(rank: number, isJoker: boolean = false): Card {
  return { rank, isJoker };
}

/**
 * 여러 개의 같은 카드를 생성합니다
 */
export function createCards(rank: number, count: number, isJoker: boolean = false): Card[] {
  return Array(count).fill(null).map(() => createCard(rank, isJoker));
}

/**
 * 조커 카드를 생성합니다
 */
export function createJoker(): Card {
  return createCard(13, true);
}
