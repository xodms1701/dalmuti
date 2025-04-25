import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomState {
    inviteCode: string;
    playerCount: number;
    maxPlayers: number;
    minPlayers: number;
    canStartGame: boolean;
    players: Array<{
        socketId: string;
        name: string;
    }>;
}

interface GameState {
    players: string[];
    currentPlayer: string;
    lastPlayedCards: Array<{ number: number; count: number }> | null;
    gameStarted: boolean;
    isRevolution: boolean;
}

interface PlayerHand {
    cards: Array<{ number: number; count: number }>;
}

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const [socketId, setSocketId] = useState<string>('');

    useEffect(() => {
        // 소켓 연결
        socketRef.current = io('http://localhost:3001');

        socketRef.current.on('connect', () => {
            setSocketId(socketRef.current?.id || '');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const createRoom = useCallback((playerName: string): Promise<{ success: boolean; inviteCode?: string; roomState?: RoomState; error?: string }> => {
        return new Promise((resolve) => {
            if (!socketRef.current) {
                resolve({ success: false, error: '소켓 연결이 없습니다.' });
                return;
            }

            socketRef.current.emit('createRoom', playerName, (response: any) => {
                resolve(response);
            });
        });
    }, []);

    const joinRoom = useCallback((inviteCode: string, playerName: string): Promise<{ success: boolean; roomState?: RoomState; error?: string }> => {
        return new Promise((resolve) => {
            if (!socketRef.current) {
                resolve({ success: false, error: '소켓 연결이 없습니다.' });
                return;
            }

            socketRef.current.emit('joinRoom', inviteCode, playerName, (response: any) => {
                resolve(response);
            });
        });
    }, []);

    const startGame = useCallback((inviteCode: string): Promise<{ success: boolean; gameState?: GameState; error?: string }> => {
        return new Promise((resolve) => {
            if (!socketRef.current) {
                resolve({ success: false, error: '소켓 연결이 없습니다.' });
                return;
            }

            socketRef.current.emit('startGame', inviteCode, (response: any) => {
                resolve(response);
            });
        });
    }, []);

    const playCards = useCallback((inviteCode: string, cards: Array<{ number: number; count: number }>): Promise<{ success: boolean; gameState?: GameState; error?: string }> => {
        return new Promise((resolve) => {
            if (!socketRef.current) {
                resolve({ success: false, error: '소켓 연결이 없습니다.' });
                return;
            }

            socketRef.current.emit('playCards', inviteCode, cards, (response: any) => {
                resolve(response);
            });
        });
    }, []);

    const onRoomStateChanged = useCallback((callback: (roomState: RoomState) => void) => {
        if (!socketRef.current) return;

        socketRef.current.on('roomStateChanged', callback);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('roomStateChanged', callback);
            }
        };
    }, []);

    const onGameStarted = useCallback((callback: (gameState: GameState) => void) => {
        if (!socketRef.current) return;

        socketRef.current.on('gameStarted', callback);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('gameStarted', callback);
            }
        };
    }, []);

    const onGameStateChanged = useCallback((callback: (gameState: GameState) => void) => {
        if (!socketRef.current) return;

        socketRef.current.on('gameStateChanged', callback);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('gameStateChanged', callback);
            }
        };
    }, []);

    const onPlayerHand = useCallback((callback: (hand: PlayerHand) => void) => {
        if (!socketRef.current) return;

        socketRef.current.on('playerHand', callback);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('playerHand', callback);
            }
        };
    }, []);

    return {
        socketId,
        createRoom,
        joinRoom,
        startGame,
        playCards,
        onRoomStateChanged,
        onGameStarted,
        onGameStateChanged,
        onPlayerHand
    };
}; 