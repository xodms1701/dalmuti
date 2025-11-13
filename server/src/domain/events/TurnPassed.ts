export default class TurnPassed {
  readonly roomId: string;
  readonly playerId: string;
  readonly timestamp: Date;

  constructor(roomId: string, playerId: string) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.timestamp = new Date();
  }
}
