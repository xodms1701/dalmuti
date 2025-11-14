import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';
import SocketManager from './socket/SocketManager';
import GameManager from './game/GameManager';
import MongoDB from './db/MongoDB';

// Phase 4: New Architecture (DDD + Clean Architecture + CQRS)
import { SocketController } from './src/presentation/controllers/SocketController';
import { MongoGameRepository } from './src/infrastructure/repositories/MongoGameRepository';
import { GameCommandService } from './src/application/services/GameCommandService';
import { GameQueryService } from './src/application/services/GameQueryService';
import { CreateGameUseCase } from './src/application/use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from './src/application/use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from './src/application/use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from './src/application/use-cases/game/ReadyGameUseCase';
import { SelectRoleUseCase } from './src/application/use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from './src/application/use-cases/game/SelectDeckUseCase';
import { PlayCardUseCase } from './src/application/use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from './src/application/use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from './src/application/use-cases/game/VoteNextGameUseCase';
import { DeleteGameUseCase } from './src/application/use-cases/game/DeleteGameUseCase';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

// GET 요청 핸들러 추가
app.get('/api', (req, res) => {
  res.json({ message: 'dalmuti' });
});

// ===== Legacy Architecture (Phase 1-3) =====
// 기본 네임스페이스 (/) 사용 - 기존 클라이언트와의 호환성 유지
const db = new MongoDB(process.env.MONGODB_URI || '', 'dalmuti');
const gameManager = new GameManager(db, io);
new SocketManager(io, gameManager);

// ===== New Architecture (Phase 4+) - DDD + Clean Architecture + CQRS =====
// /v2 네임스페이스 사용 - 신규 아키텍처 전용
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const gameRepository = new MongoGameRepository(mongoUri, 'dalmuti');

// Use Cases 인스턴스 생성
const createGameUseCase = new CreateGameUseCase(gameRepository);
const joinGameUseCase = new JoinGameUseCase(gameRepository);
const leaveGameUseCase = new LeaveGameUseCase(gameRepository);
const readyGameUseCase = new ReadyGameUseCase(gameRepository);
const selectRoleUseCase = new SelectRoleUseCase(gameRepository);
const selectDeckUseCase = new SelectDeckUseCase(gameRepository);
const playCardUseCase = new PlayCardUseCase(gameRepository);
const passTurnUseCase = new PassTurnUseCase(gameRepository);
const voteNextGameUseCase = new VoteNextGameUseCase(gameRepository);
const deleteGameUseCase = new DeleteGameUseCase(gameRepository);

// CQRS: Command Service (상태 변경)
// Repository를 직접 받지 않고 Use Cases만 조합
const gameCommandService = new GameCommandService(
  createGameUseCase,
  joinGameUseCase,
  leaveGameUseCase,
  readyGameUseCase,
  selectRoleUseCase,
  selectDeckUseCase,
  playCardUseCase,
  passTurnUseCase,
  voteNextGameUseCase,
  deleteGameUseCase
);

// CQRS: Query Service (조회)
const gameQueryService = new GameQueryService(gameRepository);

// SocketController 인스턴스 생성 (Presentation Layer)
// CQRS 패턴: Command와 Query를 분리하여 주입
// /v2 네임스페이스 사용 - Legacy와 충돌 방지
const ioV2 = io.of('/v2');
new SocketController(ioV2, gameCommandService, gameQueryService);

// MongoDB 연결
gameRepository.connect().catch((error) => {
  console.error('Failed to connect to MongoDB (New Architecture):', error);
});

const PORT = process.env.PORT || 3000;

httpServer.listen(
  {
    port: PORT,
    host: '0.0.0.0',
  },
  () => {
    // eslint-disable-next-line no-console
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  }
);
