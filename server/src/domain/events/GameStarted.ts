export default class GameStarted {
  readonly roomId: string;

  readonly playerIds: string[];

  readonly timestamp: Date;

  constructor(roomId: string, playerIds: string[]) {
    this.roomId = roomId;
    this.playerIds = playerIds;
    this.timestamp = new Date();
  }
}
