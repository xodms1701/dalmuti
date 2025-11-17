/**
 * GameMapper.ts
 *
 * Domain Entity와 MongoDB Document 간 변환을 담당하는 Mapper
 * Repository Pattern의 일부로, 도메인 모델과 영속성 모델을 분리
 */

import { Game } from '../../domain/entities/Game';
import { Player } from '../../domain/entities/Player';
import { Card } from '../../domain/entities/Card';
import { RoleSelectionCard } from '../../domain/types/GameTypes';

/**
 * MongoDB 문서 타입 정의
 */
export interface GameDocument {
  _id: string; // MongoDB의 _id를 roomId로 사용
  ownerId: string; // 방장 ID
  players: ReturnType<Player['toPlainObject']>[];
  phase: string;
  currentTurn: string | null;
  lastPlay?: { playerId: string; cards: ReturnType<Card['toPlainObject']>[] };
  deck: ReturnType<Card['toPlainObject']>[];
  round: number;
  finishedPlayers: string[];
  selectableDecks?: Array<{
    cards: ReturnType<Card['toPlainObject']>[];
    isSelected: boolean;
    selectedBy?: string;
  }>;
  roleSelectionCards?: RoleSelectionCard[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * GameMapper 클래스
 *
 * Domain Entity ↔ MongoDB Document 변환을 담당
 */
export class GameMapper {
  /**
   * Game Entity를 MongoDB Document로 변환
   *
   * @param game - Game Entity
   * @returns MongoDB Document
   */
  static toDocument(game: Game): GameDocument {
    const plainGame = game.toPlainObject();

    return {
      _id: plainGame.roomId,
      ownerId: plainGame.ownerId,
      players: plainGame.players, // Player.toPlainObject()로 이미 변환됨
      phase: plainGame.phase,
      currentTurn: plainGame.currentTurn,
      lastPlay: plainGame.lastPlay,
      deck: plainGame.deck,
      round: plainGame.round,
      finishedPlayers: plainGame.finishedPlayers,
      selectableDecks: plainGame.selectableDecks,
      roleSelectionCards: plainGame.roleSelectionCards,
      updatedAt: new Date(),
    };
  }

  /**
   * MongoDB Document를 Game Entity로 변환
   *
   * @param document - MongoDB Document
   * @returns Game Entity
   */
  static toDomain(document: GameDocument): Game {
    // MongoDB의 _id를 roomId로 매핑
    const game = Game.fromPlainObject({
      roomId: document._id,
      ownerId: document.ownerId,
      players: document.players || [],
      phase: document.phase,
      currentTurn: document.currentTurn,
      lastPlay: document.lastPlay,
      deck: document.deck || [],
      round: document.round || 0,
      finishedPlayers: document.finishedPlayers || [],
      selectableDecks: document.selectableDecks,
      roleSelectionCards: document.roleSelectionCards,
    });

    return game;
  }

  /**
   * 부분 업데이트를 위한 Document 변환
   * Partial<Game>을 받아 MongoDB update 문서로 변환
   *
   * @param updates - 업데이트할 Game의 부분 필드
   * @returns MongoDB $set 문서
   */
  static toUpdateDocument(updates: Partial<Game>): Partial<GameDocument> {
    const updateDoc: Partial<GameDocument> = {
      updatedAt: new Date(),
    };

    // Game Entity가 아닌 경우 직접 매핑
    // 실제로는 updates가 plain object일 가능성이 높음
    if ('phase' in updates && updates.phase !== undefined) {
      updateDoc.phase = updates.phase;
    }
    if ('currentTurn' in updates && updates.currentTurn !== undefined) {
      updateDoc.currentTurn = updates.currentTurn ? updates.currentTurn.value : null;
    }
    if ('lastPlay' in updates) {
      updateDoc.lastPlay = updates.lastPlay
        ? {
            playerId: updates.lastPlay.playerId.value,
            cards: updates.lastPlay.cards,
          }
        : undefined;
    }
    if ('deck' in updates && updates.deck !== undefined) {
      updateDoc.deck = updates.deck;
    }
    if ('round' in updates && updates.round !== undefined) {
      updateDoc.round = updates.round;
    }
    if ('finishedPlayers' in updates && updates.finishedPlayers !== undefined) {
      updateDoc.finishedPlayers = updates.finishedPlayers.map((fp) => fp.value);
    }
    if ('selectableDecks' in updates) {
      updateDoc.selectableDecks = updates.selectableDecks;
    }
    if ('roleSelectionCards' in updates) {
      updateDoc.roleSelectionCards = updates.roleSelectionCards;
    }
    if ('players' in updates && updates.players !== undefined) {
      updateDoc.players = updates.players.map((p) => p.toPlainObject());
    }

    return updateDoc;
  }
}
