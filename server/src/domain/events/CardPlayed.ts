import { Card } from '../entities/Card';

export default class CardPlayed {
  readonly roomId: string;

  readonly playerId: string;

  readonly cards: ReturnType<Card['toPlainObject']>[];

  readonly timestamp: Date;

  constructor(roomId: string, playerId: string, cards: ReturnType<Card['toPlainObject']>[]) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.cards = cards;
    this.timestamp = new Date();
  }
}
