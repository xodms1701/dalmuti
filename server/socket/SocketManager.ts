import { Server, Socket } from 'socket.io';
import GameManager from '../game/GameManager';
import { Card } from '../types';
import { SocketEvent } from './events';

export default class SocketManager {
  private io: Server;

  private gameManager: GameManager;

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.setupSocketHandlers();
  }

  private async emitGameState(roomId: string): Promise<void> {
    const gameState = await this.gameManager.getGameState(roomId);
    this.io.to(roomId).emit(SocketEvent.GAME_STATE_UPDATED, gameState);
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('새로운 클라이언트가 연결되었습니다:', socket.id);

      socket.on(
        SocketEvent.GET_GAME_STATE,
        async (
          { roomId }: { roomId: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const gameState = await this.gameManager.getGameState(roomId);
            if (!gameState) {
              if (typeof callback === 'function')
                callback({ success: false, error: '게임 상태를 찾을 수 없습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true, data: gameState });
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error:
                  error instanceof Error ? error.message : '게임 상태 조회 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.CREATE_GAME,
        async (
          { nickname }: { nickname: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const game = await this.gameManager.createGame(socket.id, nickname);
            if (!game) {
              if (typeof callback === 'function')
                callback({ success: false, error: '게임 생성에 실패했습니다.' });
              return;
            }
            socket.join(game.roomId);
            if (typeof callback === 'function')
              callback({ success: true, data: { roomId: game.roomId, nickname } });
            this.emitGameState(game.roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '게임 생성 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.JOIN_GAME,
        async (
          { roomId, nickname }: { roomId: string; nickname: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.joinGame(roomId, socket.id, nickname);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '게임에 참여할 수 없습니다.' });
              return;
            }
            socket.join(roomId);
            if (typeof callback === 'function')
              callback({ success: true, data: { roomId, nickname } });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '게임 참여 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.READY,
        async (
          { roomId, playerId }: { roomId: string; playerId: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const game = await this.gameManager.setPlayerReady(roomId, playerId);
            if (!game) {
              if (typeof callback === 'function')
                callback({ success: false, error: '준비 상태를 변경할 수 없습니다.' });
              return;
            }

            const allReady = game.players.every((p) => p.isReady);
            if (allReady && game.players.length >= 2) {
              this.io.to(roomId).emit(SocketEvent.ALL_PLAYERS_READY);
            }

            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error:
                  error instanceof Error ? error.message : '준비 상태 변경 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.START_GAME,
        async (
          { roomId }: { roomId: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.startGame(roomId);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '게임을 시작할 수 없습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '게임 시작 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.SELECT_ROLE,
        async (
          {
            roomId,
            playerId,
            roleNumber,
          }: { roomId: string; playerId: string; roleNumber: number },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.selectRole(roomId, playerId, roleNumber);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '역할 선택에 실패했습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '역할 선택 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.DEAL_CARDS,
        async (
          { roomId }: { roomId: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.dealCards(roomId, socket.id);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '카드 배분에 실패했습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '카드 배분 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.SELECT_DECK,
        async (
          { roomId, cardIndex }: { roomId: string; cardIndex: number },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.selectDeck(roomId, socket.id, cardIndex);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '카드를 선택할 수 없습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '카드 선택 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.PLAY_CARD,
        async (
          { roomId, playerId, cards }: { roomId: string; playerId: string; cards: Card[] },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const game = await this.gameManager.playCard(roomId, playerId, cards);
            if (!game) {
              if (typeof callback === 'function')
                callback({ success: false, error: '카드를 낼 수 없습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '카드 내기 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.PASS,
        async (
          { roomId, playerId }: { roomId: string; playerId: string },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const success = await this.gameManager.passTurn(roomId, playerId);
            if (!success) {
              if (typeof callback === 'function')
                callback({ success: false, error: '턴을 패스할 수 없습니다.' });
              return;
            }
            if (typeof callback === 'function') callback({ success: true });
            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '턴 패스 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on(
        SocketEvent.VOTE,
        async (
          { roomId, vote }: { roomId: string; vote: boolean },
          callback?: (response: { success: boolean; data?: any; error?: string }) => void
        ) => {
          try {
            const game = await this.gameManager.vote(roomId, socket.id, vote);
            if (!game) {
              if (typeof callback === 'function')
                callback({ success: false, error: '투표할 수 없는 상태입니다.' });
              return;
            }

            if (typeof callback === 'function') callback({ success: true });

            this.emitGameState(roomId);
          } catch (error) {
            if (typeof callback === 'function')
              callback({
                success: false,
                error: error instanceof Error ? error.message : '투표 중 오류가 발생했습니다.',
              });
          }
        }
      );

      socket.on('disconnect', () => {
        console.log('클라이언트가 연결을 끊었습니다:', socket.id);
      });
    });
  }
}
