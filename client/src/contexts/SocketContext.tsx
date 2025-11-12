import React, { createContext, useContext, useEffect, useState } from "react";
import { socketClient } from "../socket/socket";
import { useGameStore } from "../store/gameStore";

interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  connect: () => void;
  disconnect: () => void;
  createRoom: (
    nickname: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  joinRoom: (
    roomId: string,
    nickname: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  ready: (
    roomId: string,
    playerId: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  startGame: (
    roomId: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  selectRole: (
    roomId: string,
    playerId: string,
    roleNumber: number
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  selectDeck: (
    roomId: string,
    cardIndex: number
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  selectRevolution: (
    roomId: string,
    playerId: string,
    wantRevolution: boolean
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  playCard: (
    roomId: string,
    playerId: string,
    cards: any[]
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  pass: (
    roomId: string,
    playerId: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  vote: (
    roomId: string,
    vote: boolean
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  getGameState: (
    roomId: string
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const { setGame } = useGameStore();

  useEffect(() => {
    const handleGameUpdate = (game: any) => {
      console.log("[Socket] 게임 상태 수신:", game);
      setGame(game);
    };

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socketClient.socketId || null);
    };

    const handleError = (error: string) => {
      console.error("Socket error:", error);
    };

    socketClient.onGameUpdate(handleGameUpdate);
    socketClient.onConnect(handleConnect);
    socketClient.onError(handleError);

    return () => {
      socketClient.offGameUpdate();
      socketClient.offConnect();
      socketClient.offError();
    };
  }, [setGame]);

  const connect = () => {
    if (!isConnected) {
      socketClient.connect();
    }
  };

  const disconnect = () => {
    socketClient.disconnect();
    setIsConnected(false);
    setSocketId(null);
  };

  const createRoom = async (nickname: string) => {
    if (!socketClient.socketId) {
      return {
        success: false,
        error: "소켓이 연결되지 않았습니다.",
        data: undefined,
      };
    }
    try {
      const response = await socketClient.createRoom(nickname);
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        data: undefined,
      };
    }
  };

  const joinRoom = async (roomId: string, nickname: string) => {
    if (!socketClient.socketId) {
      return {
        success: false,
        error: "소켓이 연결되지 않았습니다.",
        data: undefined,
      };
    }
    try {
      const response = await socketClient.joinRoom(roomId, nickname);
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        data: undefined,
      };
    }
  };

  const ready = async (roomId: string, playerId: string) => {
    try {
      await socketClient.ready(roomId, playerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const startGame = async (roomId: string) => {
    try {
      await socketClient.startGame(roomId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const selectRole = async (
    roomId: string,
    playerId: string,
    roleNumber: number
  ) => {
    try {
      await socketClient.selectRole(roomId, playerId, roleNumber);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const selectDeck = async (roomId: string, cardIndex: number) => {
    try {
      await socketClient.selectDeck(roomId, cardIndex);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const selectRevolution = async (
    roomId: string,
    playerId: string,
    wantRevolution: boolean
  ) => {
    try {
      await socketClient.selectRevolution(roomId, playerId, wantRevolution);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const playCard = async (roomId: string, playerId: string, cards: any[]) => {
    try {
      await socketClient.playCard(roomId, playerId, cards);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const pass = async (roomId: string, playerId: string) => {
    try {
      await socketClient.pass(roomId, playerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const vote = async (roomId: string, vote: boolean) => {
    try {
      await socketClient.vote(roomId, vote);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        data: undefined,
      };
    }
  };

  const getGameState = async (roomId: string) => {
    try {
      const data = await socketClient.getGameState(roomId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        socketId,
        connect,
        disconnect,
        createRoom,
        joinRoom,
        ready,
        startGame,
        selectRole,
        selectDeck,
        selectRevolution,
        playCard,
        pass,
        vote,
        getGameState,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
};
