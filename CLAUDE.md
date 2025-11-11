# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

"위대한 달무티" 카드 게임의 온라인 웹 애플리케이션입니다. 4-8명이 플레이할 수 있는 멀티플레이어 게임으로, 실시간 통신을 위해 Socket.IO를 사용합니다.

## 주요 명령어

### 프론트엔드 (client/)
```bash
cd client
npm install          # 의존성 설치
npm start            # 개발 서버 실행 (포트 3000)
npm run build        # 프로덕션 빌드
npm test             # 테스트 실행
```

### 백엔드 (server/)
```bash
cd server
npm install          # 의존성 설치
npm run dev          # 개발 서버 실행 (nodemon, ts-node)
npm run build        # TypeScript 빌드 (dist/ 폴더에 출력)
npm start            # 프로덕션 서버 실행 (빌드된 파일 실행)
npm test             # Jest 테스트 실행
npm run test:watch   # Jest watch 모드
npm run lint         # ESLint 실행
npm run lint:fix     # ESLint 자동 수정
npm run format       # Prettier 포맷팅
```

### 테스트
```bash
# 특정 테스트 파일 실행
cd server
npm test -- GameManager.test.ts

# watch 모드로 테스트
npm run test:watch
```

### Docker
```bash
# MongoDB 실행
docker-compose up -d

# 서버 이미지 빌드
cd server
docker build -t dalmuti-server .
```

## 아키텍처

### 전체 구조
모노레포 형태로 client/와 server/로 분리된 구조입니다. 클라이언트와 서버는 Socket.IO를 통해 실시간으로 통신합니다.

### 백엔드 아키텍처 (server/)

**주요 컴포넌트:**
- `server.ts`: Express 서버 및 Socket.IO 서버 초기화, 의존성 주입
- `game/GameManager.ts`: 게임 로직의 핵심, 모든 게임 상태 변경 처리
  - 게임 생성/참가/나가기
  - 역할 선택 (roleSelection)
  - 카드 배분 및 선택 (dealCards, selectDeck)
  - 카드 플레이 및 패스 (playCard, passTurn)
  - 투표 및 다음 게임 시작 (vote)
- `socket/SocketManager.ts`: Socket.IO 이벤트 핸들러, GameManager 메서드 호출
- `db/MongoDB.ts`: MongoDB 데이터베이스 인터페이스 구현
- `types.ts`: 게임 상태, 플레이어, 카드 등 공유 타입 정의

**게임 페이즈 (phase) 흐름:**
1. `waiting`: 대기실, 플레이어 입장 및 준비
2. `roleSelection`: 13장의 카드 중 하나를 선택하여 역할(순위) 결정
3. `roleSelectionComplete`: 모든 플레이어의 역할 선택 완료
4. `cardSelection`: 순위 순서대로 카드 덱 선택
5. `playing`: 게임 진행 중
6. `gameEnd`: 게임 종료 (투표 거부 시)

**데이터 흐름:**
Socket 이벤트 → SocketManager → GameManager → Database → GameManager → SocketManager (브로드캐스트)

### 프론트엔드 아키텍처 (client/)

**주요 컴포넌트:**
- `socket/socket.ts`: Socket.IO 클라이언트 싱글톤, 서버 통신 로직
- `store/gameStore.ts`: Zustand 상태 관리, 게임 상태 및 UI 상태
- `pages/`: 각 게임 페이즈별 페이지 컴포넌트
  - `Lobby.tsx`: 메인 화면 (방 생성/참가)
  - `Room.tsx`: 대기실
  - `RoleSelection.tsx`: 역할 선택
  - `RankConfirmation.tsx`: 역할 선택 완료 화면
  - `SelectCardDeck.tsx`: 카드 덱 선택
  - `Play.tsx`: 게임 플레이
  - `VotePage.tsx`: 다음 게임 투표
- `contexts/SocketContext.tsx`: Socket 연결 및 이벤트 구독 관리

**상태 관리:**
- Zustand를 사용하여 전역 상태 관리
- Socket.IO 이벤트를 통해 서버로부터 게임 상태 업데이트 수신
- `GAME_STATE_UPDATED` 이벤트를 받아 게임 상태를 동기화

## 환경 변수

### 서버 (.env)
```
MONGODB_URI=mongodb://localhost:27017/dalmuti
PORT=3000
```

### 클라이언트 (.env)
```
REACT_APP_API_URL=http://localhost:3000
```

## 개발 워크플로우

### 로컬 개발
1. MongoDB 실행: `docker-compose up -d`
2. 서버 실행: `cd server && npm run dev`
3. 클라이언트 실행: `cd client && npm start`

### 테스트 작성
- 서버: `server/__tests__/` 디렉토리에 `*.test.ts` 파일 작성
- Jest 및 ts-jest 사용
- MockDatabase를 사용하여 데이터베이스 모킹

### Socket.IO 이벤트 추가
1. `server/socket/events.ts`와 `client/src/socket/events.ts`에 이벤트 이름 추가
2. `server/socket/SocketManager.ts`에 이벤트 핸들러 추가
3. `client/src/socket/socket.ts`에 클라이언트 메서드 추가
4. GameManager에 비즈니스 로직 구현

## 중요 사항

### 게임 로직
- 카드 숫자가 낮을수록 높은 등급 (1이 최고, 13이 최저)
- 조커는 단독으로 낼 때 13으로 취급, 다른 카드와 함께 낼 때는 와일드카드
- 플레이어 순위(rank)가 낮을수록 높은 순위 (1등이 rank=1)
- 게임 종료 후 투표(vote) 시스템으로 다음 게임 진행 여부 결정

### Socket.IO 통신 패턴
- 요청-응답: `emitWithAck` 사용, acknowledgement 콜백으로 성공/실패 처리
- 브로드캐스트: `GAME_STATE_UPDATED` 이벤트로 모든 클라이언트에 게임 상태 전파
- 서버는 항상 `{ success: boolean, data?: any, error?: string }` 형태로 응답

### 타입 시스템
- `server/types.ts`: 서버와 클라이언트가 공유하는 타입 정의
- `client/src/types.ts`: 클라이언트 전용 타입 (UI 상태 등)
- 게임 상태 변경 시 양쪽 타입 정의 확인 필요
