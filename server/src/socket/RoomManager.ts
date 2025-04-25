import { Room } from '../game/Room';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomName: string): Room {
    const roomCode = uuidv4().substring(0, 6);
    const room = new Room(roomCode, roomName);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  handlePlayerDisconnect(playerId: string): void {
    this.rooms.forEach(room => {
      if (room.hasPlayer(playerId)) {
        room.removePlayer(playerId);
      }
    });
  }
} 