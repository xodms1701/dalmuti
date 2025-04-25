import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { setUserId, setNickname } from '../store/userSlice';
import { setRoomCode, setRoomName } from '../store/roomSlice';
import { setGameState, setCurrentTurn, setLastPlay, setRevolution } from '../store/gameSlice';
import { Card, Player, GameState, GamePhase } from '../types';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

// 소켓 이벤트 상수
const SOCKET_EVENTS = {
  // 게임 이벤트
  GAME_STATE: 'game_state',
  JOIN_GAME: 'join_game',
  PLAYER_READY: 'player_ready',
  EXCHANGE_CARDS: 'exchange_cards',
  PLAY_CARDS: 'play_cards',
  PASS: 'pass',
  // 로비 이벤트
  LOBBY_JOINED: 'lobby_joined',
  ROOM_CREATED: 'room_created',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STARTED: 'game_started',
  CARDS_PLAYED: 'cards_played',
  DRAW_ROLE_CARD: 'draw_role_card'
} as const;

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(): void {
    this.socket = io(SERVER_URL);

    this.socket.on('connect', () => {
      console.log('소켓 연결됨');
    });

    this.socket.on(SOCKET_EVENTS.GAME_STATE, (gameState: GameState) => {
      const state = store.getState();
      const currentGameState = state.game;
      store.dispatch(setGameState({
        ...currentGameState,
        ...gameState,
        phase: gameState.phase as GamePhase
      }));
    });

    this.socket.on('error', (error) => {
      console.error('소켓 에러:', error);
    });

    // User events
    this.socket.on(SOCKET_EVENTS.LOBBY_JOINED, (data: { userId: string }) => {
      store.dispatch(setUserId(data.userId));
    });

    // Room events
    this.socket.on(SOCKET_EVENTS.ROOM_CREATED, (data: { roomCode: string, roomName: string }) => {
      store.dispatch(setRoomCode(data.roomCode));
      store.dispatch(setRoomName(data.roomName));
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: { userId: string, roomCode: string, nickname: string }) => {
      const state = store.getState();
      if (state.room.roomCode === data.roomCode) {
        const gameState = state.game;
        const newPlayer: Player = {
          id: data.userId,
          nickname: data.nickname,
          cards: [],
          role: null,
          hasDoubleJoker: false,
          isPassed: false,
          isReady: false
        };
        const updatedPlayers = [...gameState.players, newPlayer];
        store.dispatch(setGameState({ ...gameState, players: updatedPlayers }));
      }
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data: { userId: string }) => {
      const state = store.getState();
      const gameState = state.game;
      const updatedPlayers = gameState.players.filter(p => p.id !== data.userId);
      store.dispatch(setGameState({ ...gameState, players: updatedPlayers }));
    });

    // Game events
    this.socket.on(SOCKET_EVENTS.GAME_STARTED, (data: { gameId: string }) => {
      const state = store.getState();
      const gameState = state.game;
      store.dispatch(setGameState({ ...gameState, gameStarted: true, phase: GamePhase.PLAYING }));
    });

    this.socket.on(SOCKET_EVENTS.CARDS_PLAYED, (data: {
      userId: string;
      cards: Card[];
      nextTurn: string;
      revolution: boolean;
    }) => {
      store.dispatch(setLastPlay({ playerId: data.userId, cards: data.cards }));
      store.dispatch(setCurrentTurn(data.nextTurn));
      store.dispatch(setRevolution(data.revolution));
    });
  }

  // User actions
  public joinLobby(nickname: string): void {
    this.socket?.emit('join_lobby', nickname);
  }

  // Room actions
  public createRoom(nickname: string, roomName: string): void {
    this.socket?.emit('createRoom', { nickname, roomName });
  }

  public joinRoom(nickname: string, roomCode: string): void {
    this.socket?.emit('joinRoom', { nickname, roomCode });
  }

  // Game actions
  public joinGame(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.JOIN_GAME, { roomCode });
  }

  public playerReady(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_READY, { roomCode });
  }

  public exchangeCards(roomCode: string, toPlayerId: string, cards: Card[]): void {
    this.socket?.emit(SOCKET_EVENTS.EXCHANGE_CARDS, { roomCode, toPlayerId, cards });
  }

  public playCards(roomCode: string, cards: Card[]): void {
    this.socket?.emit(SOCKET_EVENTS.PLAY_CARDS, { roomCode, cards });
  }

  public pass(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.PASS, { roomCode });
  }

  public setReady(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_READY, { roomCode });
  }

  public drawRoleCard(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.DRAW_ROLE_CARD, { roomCode });
  }

  public onGameState(callback: (state: GameState) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_STATE, callback);
  }

  public offGameState(callback: (state: GameState) => void): void {
    this.socket?.off(SOCKET_EVENTS.GAME_STATE, callback);
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  public disconnect(): void {
    this.socket?.disconnect();
  }

  public onError(callback: (error: Error) => void): void {
    this.socket?.on('error', callback);
  }

  public offError(callback: (error: Error) => void): void {
    this.socket?.off('error', callback);
  }
}

export const socketManager = SocketManager.getInstance(); 