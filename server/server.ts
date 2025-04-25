import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketManager } from './socket/SocketManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const socketManager = new SocketManager(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 