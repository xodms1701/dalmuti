import { Room } from './Room';

export class RoomManager {
    private static instance: RoomManager;
    private rooms: Map<string, Room> = new Map();

    private constructor() {}

    static getInstance(): RoomManager {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    public createRoom(inviteCode: string, roomName: string): Room {
        if (this.rooms.has(inviteCode)) {
            throw new Error('Room already exists');
        }
        const room = new Room(inviteCode, roomName);
        this.rooms.set(inviteCode, room);
        return room;
    }

    public getRoom(inviteCode: string): Room | undefined {
        return this.rooms.get(inviteCode);
    }

    public removeRoom(inviteCode: string): void {
        this.rooms.delete(inviteCode);
    }

    public getRoomList() {
        return Array.from(this.rooms.entries()).map(([inviteCode, room]) => ({
            inviteCode,
            playerCount: room.getPlayers().length
        }));
    }

    private generateInviteCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    public handlePlayerDisconnect(playerId: string): void {
        this.rooms.forEach(room => {
            room.removePlayer(playerId);
        });
    }
} 