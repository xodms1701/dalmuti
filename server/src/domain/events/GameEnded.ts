export default class GameEnded {
  readonly roomId: string;
  readonly finishedOrder: string[];
  readonly timestamp: Date;

  constructor(roomId: string, finishedOrder: string[]) {
    this.roomId = roomId;
    this.finishedOrder = finishedOrder;
    this.timestamp = new Date();
  }
}
