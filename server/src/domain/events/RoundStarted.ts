export default class RoundStarted {
  readonly roomId: string;

  readonly round: number;

  readonly firstPlayerId: string;

  readonly timestamp: Date;

  constructor(roomId: string, round: number, firstPlayerId: string) {
    this.roomId = roomId;
    this.round = round;
    this.firstPlayerId = firstPlayerId;
    this.timestamp = new Date();
  }
}
