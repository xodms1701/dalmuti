import { Server } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { Card, WaitingPlayer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function initializeSocket(io: Server) {
    const roomManager = RoomManager.getInstance();

    io.on('connection', (socket) => {
        console.log('새로운 클라이언트가 연결되었습니다:', socket.id);

        // 방 생성
        socket.on('createRoom', (data: { nickname: string; roomName: string }, callback) => {
            try {
                const inviteCode = uuidv4().substring(0, 6);
                const room = roomManager.createRoom(inviteCode, data.roomName);
                const player: WaitingPlayer = {
                    id: socket.id,
                    nickname: data.nickname,
                    phase: 'waiting',
                    isReady: false
                };
                room.addPlayer(player);
                socket.join(inviteCode);
                callback({
                    success: true,
                    inviteCode,
                    roomState: room.getRoomState()
                });
            } catch (error) {
                callback({
                    success: false,
                    error: '방 생성에 실패했습니다.'
                });
            }
        });

        // 방 참가
        socket.on('joinRoom', (data: { inviteCode: string; nickname: string }, callback) => {
            try {
                const room = roomManager.getRoom(data.inviteCode);
                if (!room) {
                    throw new Error('존재하지 않는 방입니다.');
                }
                const player: WaitingPlayer = {
                    id: socket.id,
                    nickname: data.nickname,
                    phase: 'waiting',
                    isReady: false
                };
                room.addPlayer(player);
                socket.join(data.inviteCode);
                io.to(data.inviteCode).emit('roomStateChanged', room.getRoomState());
                callback({
                    success: true,
                    roomState: room.getRoomState()
                });
            } catch (error) {
                callback({
                    success: false,
                    error: '방 참가에 실패했습니다.'
                });
            }
        });

        // 게임 시작
        socket.on('startGame', (inviteCode: string, callback) => {
            try {
                const room = roomManager.getRoom(inviteCode);
                if (!room) {
                    throw new Error('존재하지 않는 방입니다.');
                }
                room.startGame();
                const gameState = room.getGameState();
                io.to(inviteCode).emit('gameStarted', gameState);
                callback({
                    success: true,
                    gameState
                });
            } catch (error) {
                callback({
                    success: false,
                    error: '게임 시작에 실패했습니다.'
                });
            }
        });

        // 카드 내기
        socket.on('playCards', (data: { inviteCode: string; cards: Card[] }, callback) => {
            try {
                const room = roomManager.getRoom(data.inviteCode);
                if (!room) {
                    throw new Error('존재하지 않는 방입니다.');
                }
                const success = room.playCards(socket.id, data.cards);
                if (success) {
                    const gameState = room.getGameState();
                    io.to(data.inviteCode).emit('gameStateChanged', gameState);
                    callback({
                        success: true,
                        gameState
                    });
                } else {
                    throw new Error('카드를 낼 수 없습니다.');
                }
            } catch (error) {
                callback({
                    success: false,
                    error: '카드 내기에 실패했습니다.'
                });
            }
        });

        // 연결 해제
        socket.on('disconnect', () => {
            console.log('클라이언트가 연결을 해제했습니다:', socket.id);
            roomManager.handlePlayerDisconnect(socket.id);
        });
    });
} 