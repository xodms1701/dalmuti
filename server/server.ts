import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';
import SocketManager from './socket/SocketManager';
import GameManager from './game/GameManager';
import MongoDB from './db/MongoDB';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const db = new MongoDB(process.env.MONGODB_URI || '', 'dalmuti');
const gameManager = new GameManager(db);
new SocketManager(io, gameManager);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
