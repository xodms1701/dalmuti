import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager';
import { Card } from '../types';

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  private rooms: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameManager();
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('새로운 클라이언트가 연결되었습니다:', socket.id);

      socket.on('joinRoom', (roomId: string, playerId: string, nickname: string) => {
        socket.join(roomId);
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)?.add(playerId);
        this.gameManager.addPlayer(playerId, nickname);
        this.io.to(roomId).emit('playerJoined', playerId);
      });

      socket.on('leaveRoom', (roomId: string, playerId: string) => {
        socket.leave(roomId);
        this.rooms.get(roomId)?.delete(playerId);
        this.gameManager.removePlayer(playerId);
        this.io.to(roomId).emit('playerLeft', playerId);
      });

      socket.on('startGame', (roomId: string) => {
        this.gameManager.startGame();
        const playerIds = Array.from(this.rooms.get(roomId) || []);
        const gameState = this.gameManager.getGameState();
        this.io.to(roomId).emit('gameStarted', gameState);
      });

      socket.on('playCards', (roomId: string, playerId: string, cards: Card[]) => {
        const success = this.gameManager.playCards(playerId, cards);
        if (success) {
          const gameState = this.gameManager.getGameState();
          this.io.to(roomId).emit('gameStateUpdated', gameState);
        }
      });

      socket.on('disconnect', () => {
        console.log('클라이언트가 연결을 끊었습니다:', socket.id);
      });
    });
  }
} 