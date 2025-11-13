export default class CardPlayed {
  readonly roomId: string;
  readonly playerId: string;
  readonly cards: any[];
  readonly timestamp: Date;

  constructor(roomId: string, playerId: string, cards: any[]) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.cards = cards;
    this.timestamp = new Date();
  }
}
