import { Server, Socket } from 'socket.io';
import { Game as GameClass } from '../game/Game';
import { Card } from '../game/types';
import { RoomManager } from '../game/RoomManager';
import { WaitingPlayer } from '../types';

export class SocketManager {
  private io: Server;
  private games: Map<string, GameClass>;
  private roomManager: RoomManager;

  constructor(io: Server) {
    this.io = io;
    this.games = new Map();
    this.roomManager = RoomManager.getInstance();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // User events
      socket.on('join_lobby', (nickname: string) => {
        console.log('로비 입장:', nickname);
        socket.emit('lobby_joined', { userId: socket.id });
      });

      // Room events
      socket.on('createRoom', (data: { nickname: string; roomName: string }) => {
        try {
          const room = this.roomManager.createRoom(socket.id, data.roomName);
          const player: WaitingPlayer = {
            id: socket.id,
            nickname: data.nickname,
            phase: 'waiting',
            isReady: false
          };
          room.addPlayer(player);
          socket.join(room.getInviteCode());
          socket.emit('roomCreated', { inviteCode: room.getInviteCode() });
        } catch (error) {
          socket.emit('error', { message: 'Failed to create room' });
        }
      });

      socket.on('joinRoom', (data: { nickname: string; inviteCode: string }) => {
        try {
          const room = this.roomManager.getRoom(data.inviteCode);
          if (!room) {
            throw new Error('Room not found');
          }
          const player: WaitingPlayer = {
            id: socket.id,
            nickname: data.nickname,
            phase: 'waiting',
            isReady: false
          };
          room.addPlayer(player);
          socket.join(data.inviteCode);
          socket.emit('roomJoined', { roomState: room.getRoomState() });
          socket.to(data.inviteCode).emit('playerJoined', { player });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Game events
      socket.on('start_game', (data: { userId: string, roomCode: string }) => {
        const room = this.roomManager.getRoom(data.roomCode);
        if (room) {
          room.startGame();
          this.io.to(data.roomCode).emit('game_started', { gameId: data.roomCode });
        }
      });

      socket.on('playCards', (data: { roomCode: string, cards: any[] }) => {
        const room = this.roomManager.getRoom(data.roomCode);
        if (room) {
          const result = room.playCards(socket.id, data.cards);
          if (result) {
            this.io.to(data.roomCode).emit('cards_played', {
              userId: socket.id,
              cards: data.cards,
              nextTurn: room.getCurrentTurn()
            });

            if (room.getGame().isGameOver()) {
              const winnerId = room.getGame().getWinner();
              this.io.to(data.roomCode).emit('game_over', { winnerId });
            }
          }
        }
      });

      socket.on('pass', (data: { roomCode: string }) => {
        const room = this.roomManager.getRoom(data.roomCode);
        if (room) {
          room.pass(socket.id);
          this.io.to(data.roomCode).emit('turn_passed', {
            userId: socket.id,
            nextTurn: room.getCurrentTurn()
          });
        }
      });

      // 역할 카드 뽑기
      socket.on('drawRoleCard', (data: { roomCode: string }) => {
        const game = this.games.get(data.roomCode);
        if (!game) return;

        try {
          const role = game.drawRoleCard(socket.id);
          socket.emit('roleCardDrawn', { role });
          this.io.to(data.roomCode).emit('gameState', game.getGameState());
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      // 카드 교환
      socket.on('exchangeCards', (data: { 
        roomCode: string; 
        toPlayerId: string; 
        cards: any[] 
      }) => {
        const room = this.roomManager.getRoom(data.roomCode);
        if (room) {
          try {
            room.exchangeCards(socket.id, data.toPlayerId, data.cards);
            this.io.to(data.roomCode).emit('cards_exchanged', {
              fromPlayerId: socket.id,
              toPlayerId: data.toPlayerId,
              cards: data.cards
            });
          } catch (error: any) {
            socket.emit('error', { message: error.message });
          }
        }
      });

      // 연결 해제
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.roomManager.handlePlayerDisconnect(socket.id);
      });
    });
  }
} 