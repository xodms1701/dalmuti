import { Database, Game } from '../../types';

export default class MockDatabase implements Database {
  private games: Map<string, Game> = new Map();

  async createGame(game: Game): Promise<Game | null> {
    this.games.set(game.roomId, game);
    return game;
  }

  async getGame(roomId: string): Promise<Game | null> {
    return this.games.get(roomId) || null;
  }

  async updateGame(roomId: string, game: Partial<Game>): Promise<Game | null> {
    const existingGame = this.games.get(roomId);
    if (!existingGame) {
      return null;
    }

    const updatedGame = { ...existingGame, ...game };
    this.games.set(roomId, updatedGame);
    return updatedGame;
  }

  async deleteGame(roomId: string): Promise<boolean> {
    return this.games.delete(roomId);
  }

  // 테스트를 위한 헬퍼 메서드
  clear(): void {
    this.games.clear();
  }

  getGames(): Map<string, Game> {
    return this.games;
  }
}
