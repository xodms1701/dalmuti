import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';

// Phase 4+: New Architecture (DDD + Clean Architecture + CQRS)
import { SocketCoordinator } from './src/presentation/socket/SocketCoordinator';
import { MongoGameRepository } from './src/infrastructure/repositories/MongoGameRepository';
import { GameCommandService } from './src/application/services/GameCommandService';
import { GameQueryService } from './src/application/services/GameQueryService';
import { CreateGameUseCase } from './src/application/use-cases/game/CreateGameUseCase';
import { JoinGameUseCase } from './src/application/use-cases/game/JoinGameUseCase';
import { LeaveGameUseCase } from './src/application/use-cases/game/LeaveGameUseCase';
import { ReadyGameUseCase } from './src/application/use-cases/game/ReadyGameUseCase';
import { StartGameUseCase } from './src/application/use-cases/game/StartGameUseCase';
import { SelectRoleUseCase } from './src/application/use-cases/game/SelectRoleUseCase';
import { SelectDeckUseCase } from './src/application/use-cases/game/SelectDeckUseCase';
import { SelectRevolutionUseCase } from './src/application/use-cases/game/SelectRevolutionUseCase';
import { PlayCardUseCase } from './src/application/use-cases/game/PlayCardUseCase';
import { PassTurnUseCase } from './src/application/use-cases/game/PassTurnUseCase';
import { VoteNextGameUseCase } from './src/application/use-cases/game/VoteNextGameUseCase';
import { DeleteGameUseCase } from './src/application/use-cases/game/DeleteGameUseCase';
import { TransitionTaxToPlayingUseCase } from './src/application/use-cases/game/TransitionTaxToPlayingUseCase';
import { TransitionToCardSelectionUseCase } from './src/application/use-cases/game/TransitionToCardSelectionUseCase';

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
app.get('/api', (_req, res) => {
  res.json({ message: 'dalmuti' });
});

// ===== New Architecture (DDD + Clean Architecture + CQRS) =====
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const gameRepository = new MongoGameRepository(mongoUri, 'dalmuti');

// Use Cases 인스턴스 생성
const createGameUseCase = new CreateGameUseCase(gameRepository);
const joinGameUseCase = new JoinGameUseCase(gameRepository);
const leaveGameUseCase = new LeaveGameUseCase(gameRepository);
const readyGameUseCase = new ReadyGameUseCase(gameRepository);
const startGameUseCase = new StartGameUseCase(gameRepository);
const selectRoleUseCase = new SelectRoleUseCase(gameRepository);
const selectDeckUseCase = new SelectDeckUseCase(gameRepository);
const selectRevolutionUseCase = new SelectRevolutionUseCase(gameRepository);
const playCardUseCase = new PlayCardUseCase(gameRepository);
const passTurnUseCase = new PassTurnUseCase(gameRepository);
const voteNextGameUseCase = new VoteNextGameUseCase(gameRepository);
const deleteGameUseCase = new DeleteGameUseCase(gameRepository);
const transitionTaxToPlayingUseCase = new TransitionTaxToPlayingUseCase(gameRepository);
const transitionToCardSelectionUseCase = new TransitionToCardSelectionUseCase(gameRepository);

// CQRS: Command Service (상태 변경)
// Repository를 직접 받지 않고 Use Cases만 조합
const gameCommandService = new GameCommandService(
  createGameUseCase,
  joinGameUseCase,
  leaveGameUseCase,
  readyGameUseCase,
  startGameUseCase,
  selectRoleUseCase,
  selectDeckUseCase,
  selectRevolutionUseCase,
  playCardUseCase,
  passTurnUseCase,
  voteNextGameUseCase,
  deleteGameUseCase,
  transitionTaxToPlayingUseCase,
  transitionToCardSelectionUseCase
);

// CQRS: Query Service (조회)
const gameQueryService = new GameQueryService(gameRepository);

// SocketCoordinator 인스턴스 생성 (Presentation Layer)
// CQRS 패턴: Command와 Query를 분리하여 주입
// 기본 네임스페이스 (/) 사용 - Phase 5-2에서 Legacy 대체
// Primary Adapter 패턴: GameEvent, CardEvent, RoleSelectionEvent Adapter 조율
new SocketCoordinator(io, gameCommandService, gameQueryService);

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
