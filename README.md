# 달무티 게임

위대한 달무티 게임을 온라인으로 즐길 수 있는 웹 애플리케이션입니다.

## 게임 규칙

### 기본 규칙

- 4~8명이 플레이할 수 있는 카드 게임입니다.
- 카드의 숫자가 작을수록 높은 등급을 가집니다.
- 1(달무티)이 가장 높은 등급이고, 13이 가장 낮은 등급입니다.
- 조커는 13과 같은 등급을 가집니다.

### 게임 진행

1. 13장의 카드를 각각 하나씩 뽑아 자신의 계급을 정합니다.
2. 가장 낮은 숫자의 카드를 뽑은 플레이어가 선이 됩니다.
3. 선 플레이어가 카드를 내면, 시계 방향으로 다음 플레이어가 같은 개수의 더 낮은 카드를 내야 합니다.
   - 같은 숫자나 더 높은 등급(숫자가 낮은 카드)의 카드만 낼 수 있습니다.
   - 낼 수 있는 카드가 없으면 "패스"를 선언합니다.
   - 조커카드는 1개만 제출하면 13으로 취급되지만, 다른 카드와 함께내면 그 카드와 같은 숫자로 취급됩니다.
4. 모든 플레이어가 "패스"를 하면, 마지막으로 카드를 낸 플레이어가 새로운 선이 됩니다.
5. 카드를 모두 내면 게임이 종료됩니다.

### 승리 조건

- 가장 먼저 카드를 모두 내는 플레이어가 1등이 됩니다.
- 마지막으로 카드를 내는 플레이어가 꼴등이 됩니다.

## 프로젝트 구조

```
.
├── client/          # React + TypeScript 프론트엔드
├── server/          # Node.js + TypeScript 백엔드
└── docker-compose.yml
```

## 기술 스택

### 프론트엔드

- React
- TypeScript
- Socket.IO Client

### 백엔드

- Node.js
- Express
- TypeScript
- Socket.IO
- MongoDB
- Jest (테스트)

## 시작하기

### 환경 요구사항

- Node.js 18 이상
- Docker & Docker Compose
- MongoDB

### 설치 및 실행

1. 저장소 클론

```bash
git clone [repository-url]
cd dalmuti
```

2. 의존성 설치

```bash
# 서버 의존성 설치
cd server
npm install

# 클라이언트 의존성 설치
cd ../client
npm install
```

3. MongoDB 실행

```bash
docker-compose up -d
```

4. 서버 실행

```bash
cd server
npm run dev
```

5. 클라이언트 실행

```bash
cd client
npm start
```

## 테스트

서버 테스트 실행:

```bash
cd server
npm test
```

## CI/CD

GitHub Actions를 사용하여 CI 파이프라인이 구성되어 있습니다:

- main 브랜치에 push 또는 pull request가 생성될 때 자동으로 테스트가 실행됩니다.

## 라이센스

MIT
