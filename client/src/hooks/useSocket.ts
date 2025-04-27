import { useCallback, useEffect, useState, useRef } from "react";
import { socketClient } from "../socket/socket";
import { useGameStore } from "../store/gameStore";

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const { setGame } = useGameStore();
  const isConnecting = useRef(false);

  useEffect(() => {
    if (isConnecting.current) {
      console.log("[Socket] 이미 연결 시도 중입니다.");
      return;
    }

    if (socketClient.socketId) {
      console.log(
        "[Socket] 이미 연결되어 있습니다. Socket ID:",
        socketClient.socketId
      );
      setIsConnected(true);
      setSocketId(socketClient.socketId);
      return;
    }

    console.log("[Socket] 소켓 연결을 시도합니다...");
    isConnecting.current = true;
    socketClient.connect();

    const handleGameUpdate = (game: any) => {
      console.log("[Socket] 게임 상태 업데이트:", game);
      setGame(game);
    };

    const handleConnect = () => {
      console.log("[Socket] 소켓 연결 성공! Socket ID:", socketClient.socketId);
      setIsConnected(true);
      setSocketId(socketClient.socketId || null);
      isConnecting.current = false;
    };

    const handleError = (error: string) => {
      console.error("[Socket] 소켓 에러 발생:", error);
      isConnecting.current = false;
    };

    socketClient.onGameUpdate(handleGameUpdate);
    socketClient.onConnect(handleConnect);
    socketClient.onError(handleError);

    return () => {
      console.log("[Socket] 소켓 연결을 정리합니다...");
      socketClient.offGameUpdate();
      socketClient.offConnect();
      socketClient.offError();
      socketClient.disconnect();
      isConnecting.current = false;
    };
  }, [setGame]);

  const createRoom = useCallback(
    async (nickname: string) => {
      console.log("[Socket] 방 생성 시도 - 닉네임:", nickname);
      if (!socketId) {
        console.error("[Socket] 소켓이 연결되지 않았습니다.");
        return { success: false, error: "소켓이 연결되지 않았습니다." };
      }

      try {
        const response = await socketClient.createRoom(nickname);
        console.log("[Socket] 방 생성 응답:", response);
        return { ...response };
      } catch (error) {
        console.error("[Socket] 방 생성 중 에러 발생:", error);
        return { success: false, error: (error as Error).message };
      }
    },
    [socketId]
  );

  const joinRoom = useCallback(
    async (roomId: string, nickname: string) => {
      console.log(
        "[Socket] 방 참가 시도 - 방 ID:",
        roomId,
        "닉네임:",
        nickname
      );
      if (!socketId) {
        console.error("[Socket] 소켓이 연결되지 않았습니다.");
        return { success: false, error: "소켓이 연결되지 않았습니다." };
      }

      try {
        const response = await socketClient.joinRoom(roomId, nickname);
        console.log("[Socket] 방 참가 응답:", response);
        return { success: true, ...response };
      } catch (error) {
        console.error("[Socket] 방 참가 중 에러 발생:", error);
        return { success: false, error: (error as Error).message };
      }
    },
    [socketId]
  );

  const ready = useCallback(
    async (roomId: string, playerId: string) => {
      if (!socketId) {
        return { success: false, error: "소켓이 연결되지 않았습니다." };
      }

      try {
        await socketClient.ready(roomId, playerId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [socketId]
  );

  const startGame = useCallback(
    async (roomId: string) => {
      if (!socketId) {
        return { success: false, error: "소켓이 연결되지 않았습니다." };
      }

      try {
        await socketClient.startGame(roomId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [socketId]
  );

  const getGameState = useCallback(
    async (roomId: string) => {
      if (!socketId) {
        return { success: false, error: "소켓이 연결되지 않았습니다." };
      }

      try {
        const gameState = await socketClient.getGameState(roomId);
        return { success: true, gameState };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
    [socketId]
  );

  return {
    isConnected,
    socketId,
    createRoom,
    joinRoom,
    ready,
    startGame,
    getGameState,
  };
};
