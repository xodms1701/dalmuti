import { MongoClient, Db, Collection } from 'mongodb';
import { Game, Database } from '../types';

export default class MongoDB implements Database {
  private client: MongoClient;

  private db: Db;

  private games: Collection<Game>;

  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri);
    this.db = this.client.db(dbName);
    this.games = this.db.collection<Game>('games');
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async createGame(game: Game): Promise<Game> {
    const result = await this.games.insertOne(game);
    const insertedDoc = await this.games.findOne({ _id: result.insertedId });

    if (!insertedDoc) {
      throw new Error('게임 생성에 실패했습니다.');
    }

    return insertedDoc;
  }

  async getGame(roomId: string): Promise<Game | null> {
    return await this.games.findOne({ roomId });
  }

  async updateGame(roomId: string, game: Partial<Game>): Promise<Game | null> {
    const result = await this.games.findOneAndUpdate(
      { roomId },
      { $set: { ...game, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async deleteGame(roomId: string): Promise<boolean> {
    const result = await this.games.deleteOne({ roomId });
    return result.deletedCount > 0;
  }

  async listGames(): Promise<Game[]> {
    return await this.games.find().toArray();
  }
}
