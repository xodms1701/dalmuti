/**
 * MongoGameRepository.ts
 *
 * IGameRepository의 MongoDB 구현체 (Adapter)
 * Hexagonal Architecture의 Infrastructure Layer에 위치
 */

import { Collection, Db, MongoClient, MongoError } from 'mongodb';
import { IGameRepository } from '../../application/ports/IGameRepository';
import {
  NotFoundError,
  DuplicateError,
  ConnectionError,
  RepositoryError,
} from '../../application/ports/RepositoryError';
import { Game } from '../../domain/entities/Game';
import { RoomId } from '../../domain/value-objects/RoomId';
import { GameMapper, GameDocument } from './GameMapper';

/**
 * MongoGameRepository
 *
 * MongoDB를 사용한 IGameRepository 구현체
 * Game Entity의 영속성을 담당
 */
export class MongoGameRepository implements IGameRepository {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<GameDocument>;

  /**
   * Constructor
   *
   * @param uri - MongoDB 연결 URI
   * @param dbName - 데이터베이스 이름
   * @param collectionName - 컬렉션 이름 (기본값: 'games')
   */
  constructor(
    uri: string,
    dbName: string,
    collectionName: string = 'games'
  ) {
    this.client = new MongoClient(uri);
    this.db = this.client.db(dbName);
    this.collection = this.db.collection<GameDocument>(collectionName);
  }

  /**
   * MongoDB 연결
   * 애플리케이션 시작 시 호출
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('MongoDB connection failed:', message);
      throw new ConnectionError(message);
    }
  }

  /**
   * MongoDB 연결 해제
   * 애플리케이션 종료 시 호출
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('MongoDB disconnection failed:', message);
      throw new ConnectionError(message);
    }
  }

  /**
   * ID로 게임 조회
   *
   * @param roomId - 방 ID (RoomId Value Object)
   * @returns Game Entity 또는 null
   */
  async findById(roomId: RoomId): Promise<Game | null> {
    try {
      const document = await this.collection.findOne({ _id: roomId.value });

      if (!document) {
        return null;
      }

      return GameMapper.toDomain(document);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to find game by id: ${roomId.value}`, message);
      throw new RepositoryError(`Failed to find game: ${message}`);
    }
  }

  /**
   * 게임 저장
   * 새로운 게임을 생성합니다.
   *
   * @param game - Game Entity
   * @throws DuplicateError - 이미 같은 roomId가 존재하는 경우
   */
  async save(game: Game): Promise<void> {
    try {
      const document = GameMapper.toDocument(game);

      // createdAt 추가
      const documentWithTimestamp = {
        ...document,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.collection.insertOne(documentWithTimestamp as any);
    } catch (error) {
      // MongoDB duplicate key error (code 11000)
      if (error instanceof MongoError && error.code === 11000) {
        console.error(`Duplicate game id: ${game.roomId.value}`);
        throw new DuplicateError('Game', game.roomId.value);
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to save game: ${game.roomId.value}`, message);
      throw new RepositoryError(`Failed to save game: ${message}`);
    }
  }

  /**
   * 게임 삭제
   *
   * @param roomId - 방 ID (RoomId Value Object)
   * @throws NotFoundError - 게임이 존재하지 않는 경우
   */
  async delete(roomId: RoomId): Promise<void> {
    try {
      const result = await this.collection.deleteOne({ _id: roomId.value });

      if (result.deletedCount === 0) {
        throw new NotFoundError('Game', roomId.value);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to delete game: ${roomId.value}`, message);
      throw new RepositoryError(`Failed to delete game: ${message}`);
    }
  }

  /**
   * 게임 부분 업데이트
   *
   * @param roomId - 방 ID (RoomId Value Object)
   * @param updates - 업데이트할 필드들
   * @returns 업데이트된 Game Entity 또는 null
   * @throws NotFoundError - 게임이 존재하지 않는 경우
   */
  async update(
    roomId: RoomId,
    updates: Partial<Game>
  ): Promise<Game | null> {
    try {
      const updateDocument = GameMapper.toUpdateDocument(updates);

      const result = await this.collection.findOneAndUpdate(
        { _id: roomId.value },
        { $set: updateDocument },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new NotFoundError('Game', roomId.value);
      }

      return GameMapper.toDomain(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to update game: ${roomId.value}`, message);
      throw new RepositoryError(`Failed to update game: ${message}`);
    }
  }

  /**
   * 모든 게임 조회
   *
   * @returns Game Entity 배열
   */
  async findAll(): Promise<Game[]> {
    try {
      const documents = await this.collection.find().toArray();

      return documents.map((doc) => GameMapper.toDomain(doc));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to find all games', message);
      throw new RepositoryError(`Failed to find all games: ${message}`);
    }
  }

  /**
   * 컬렉션 가져오기 (테스트용)
   * 테스트에서 데이터 정리 시 사용
   *
   * @returns MongoDB Collection
   */
  getCollection(): Collection<GameDocument> {
    return this.collection;
  }
}
