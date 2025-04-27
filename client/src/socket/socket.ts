import { io, Socket } from "socket.io-client";
import { Card, Game } from "../types";
import { SocketEvent } from "./events";

class SocketClient {
  private socket: Socket | null = null;
  private gameUpdateCallback: ((game: Game) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private gameCreatedCallback:
    | ((data: { roomId: string; nickname: string }) => void)
    | null = null;
  private allPlayersReadyCallback: (() => void) | null = null;
  private gameEndedCallback: (() => void) | null = null;
  private nextGameStartedCallback: ((game: Game) => void) | null = null;
  private connectCallback: (() => void) | null = null;

  connect(url: string = "http://localhost:3000") {
    console.log("[Socket] 서버 URL:", url);

    if (this.socket?.connected) {
      console.log("[Socket] 이미 연결되어 있습니다.");
      return;
    }

    this.socket = io(url, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 연결 이벤트를 먼저 등록
    this.socket.on("connect", () => {
      console.log("[Socket] 서버에 연결되었습니다.");
      if (this.connectCallback) {
        this.connectCallback();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] 연결 에러:", error);
      if (this.errorCallback) {
        this.errorCallback(error.message);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] 연결이 끊어졌습니다:", reason);
    });

    // 알림/브로드캐스트(콜백 없이 단방향)
    this.socket.on(SocketEvent.GAME_STATE_UPDATED, (game: Game) => {
      if (this.gameUpdateCallback) {
        this.gameUpdateCallback(game);
      }
    });

    this.socket.on(
      SocketEvent.GAME_CREATED,
      (data: { roomId: string; nickname: string }) => {
        if (this.gameCreatedCallback) {
          this.gameCreatedCallback(data);
        }
      }
    );

    this.socket.on(SocketEvent.ALL_PLAYERS_READY, () => {
      if (this.allPlayersReadyCallback) {
        this.allPlayersReadyCallback();
      }
    });

    this.socket.on(SocketEvent.GAME_ENDED, () => {
      if (this.gameEndedCallback) {
        this.gameEndedCallback();
      }
    });

    this.socket.on(SocketEvent.NEXT_GAME_STARTED, (game: Game) => {
      if (this.nextGameStartedCallback) {
        this.nextGameStartedCallback(game);
      }
    });

    this.socket.on(SocketEvent.ERROR, (error: string) => {
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onGameUpdate(callback: (game: Game) => void) {
    this.gameUpdateCallback = callback;
  }

  offGameUpdate() {
    this.gameUpdateCallback = null;
  }

  onGameCreated(
    callback: (data: { roomId: string; nickname: string }) => void
  ) {
    this.gameCreatedCallback = callback;
  }

  onAllPlayersReady(callback: () => void) {
    this.allPlayersReadyCallback = callback;
  }

  onGameEnded(callback: () => void) {
    this.gameEndedCallback = callback;
  }

  onNextGameStarted(callback: (game: Game) => void) {
    this.nextGameStartedCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.errorCallback = callback;
  }

  offError() {
    this.errorCallback = null;
  }

  onConnect(callback: () => void) {
    this.connectCallback = callback;
  }

  offConnect() {
    this.connectCallback = null;
  }

  get socketId(): string | null {
    return this.socket?.id || null;
  }

  // 요청-응답(acknowledgement)이 필요한 경우에만 사용
  private emitWithAck<T>(event: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket is not connected"));
        return;
      }
      // 콜백을 항상 넘김
      this.socket.emit(
        event,
        data,
        (response: { success: boolean; data?: T; error?: string }) => {
          if (response.success) {
            resolve(response.data as T);
          } else {
            reject(new Error(response.error || "Unknown error"));
          }
        }
      );
    });
  }

  // 요청-응답 메서드들
  getGameState(roomId: string): Promise<Game> {
    return this.emitWithAck<Game>(SocketEvent.GET_GAME_STATE, { roomId });
  }

  createRoom(nickname: string): Promise<{ roomId: string; nickname: string }> {
    return this.emitWithAck<{ roomId: string; nickname: string }>(
      SocketEvent.CREATE_GAME,
      { nickname }
    );
  }

  joinRoom(
    roomId: string,
    nickname: string
  ): Promise<{ roomId: string; nickname: string }> {
    return this.emitWithAck<{ roomId: string; nickname: string }>(
      SocketEvent.JOIN_GAME,
      { roomId: roomId, nickname }
    );
  }

  ready(roomId: string, playerId: string): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.READY, {
      roomId: roomId,
      playerId,
    });
  }

  startGame(roomId: string): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.START_GAME, { roomId: roomId });
  }

  selectRole(
    roomId: string,
    playerId: string,
    roleNumber: number
  ): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.SELECT_ROLE, {
      roomId: roomId,
      playerId,
      roleNumber,
    });
  }

  dealCards(roomId: string): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.DEAL_CARDS, { roomId: roomId });
  }

  selectDeck(roomId: string, cardIndex: number): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.SELECT_DECK, {
      roomId: roomId,
      cardIndex,
    });
  }

  playCard(roomId: string, playerId: string, cards: Card[]): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.PLAY_CARD, {
      roomId: roomId,
      playerId,
      cards,
    });
  }

  pass(roomId: string, playerId: string): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.PASS, {
      roomId: roomId,
      playerId,
    });
  }

  vote(roomId: string, playerId: string, vote: boolean): Promise<void> {
    return this.emitWithAck<void>(SocketEvent.VOTE, {
      roomId: roomId,
      playerId,
      vote,
    });
  }
}

export const socketClient = new SocketClient();
export default socketClient;
