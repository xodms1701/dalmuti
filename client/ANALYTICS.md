# Google Analytics 설정 가이드

## 1. Google Analytics 4 (GA4) 설정

### GA4 계정 생성 및 Measurement ID 확인

1. [Google Analytics](https://analytics.google.com/)에 접속
2. 계정이 없다면 새로운 계정 생성
3. "관리" → "속성 만들기" 클릭
4. 속성 이름 입력 (예: 위대한 달무티)
5. 웹 스트림 추가
6. 표시되는 **Measurement ID** (G-XXXXXXXXXX) 복사

### 환경 변수 설정

`client/.env` 파일에 Measurement ID를 입력하세요:

```env
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 2. 자동으로 추적되는 항목

설정이 완료되면 다음 항목들이 자동으로 추적됩니다:

- **페이지 뷰**: 모든 페이지 전환이 자동으로 추적됩니다
- **기본 이벤트**: 스크롤, 클릭 등

## 3. 커스텀 이벤트 추적

게임 내 특정 이벤트를 추적하려면 `analytics.ts`의 헬퍼 함수를 사용하세요:

### 기본 사용법

```typescript
import { trackEvent } from './analytics';

// 커스텀 이벤트
trackEvent('카테고리', '액션', '라벨', 값);
```

### 게임 이벤트 추적

```typescript
import { trackGameEvent } from './analytics';

// 방 생성
trackGameEvent.createRoom(roomId);

// 방 참가
trackGameEvent.joinRoom(roomId);

// 게임 시작
trackGameEvent.startGame(playerCount);

// 게임 종료
trackGameEvent.endGame(durationInSeconds);

// 카드 플레이
trackGameEvent.playCard(cardValue, cardCount);

// 패스
trackGameEvent.pass();
```

## 4. 사용 예시

### Lobby.tsx - 방 생성 시

```typescript
import { trackGameEvent } from '../analytics';

const handleCreateRoom = async () => {
  const response = await createRoom();
  if (response.success) {
    trackGameEvent.createRoom(response.roomId);
  }
};
```

### Play.tsx - 카드 플레이 시

```typescript
import { trackGameEvent } from '../analytics';

const handlePlayCard = async (cards: Card[]) => {
  const response = await playCard(cards);
  if (response.success) {
    trackGameEvent.playCard(cards[0].value, cards.length);
  }
};
```

## 5. 데이터 확인

1. [Google Analytics](https://analytics.google.com/) 접속
2. 해당 속성 선택
3. "보고서" → "실시간" 에서 실시간 데이터 확인
4. "보고서" → "참여도" → "이벤트" 에서 커스텀 이벤트 확인

## 6. 개발 환경에서 테스트

개발 중에는 console에 "Google Analytics initialized" 메시지가 표시됩니다.
Measurement ID가 없으면 경고 메시지가 표시되지만 앱은 정상 작동합니다.

## 주의사항

- `.env` 파일은 git에 커밋되지 않으므로 배포 환경에서 별도로 설정해야 합니다
- Vercel의 경우: Settings → Environment Variables에서 `REACT_APP_GA_MEASUREMENT_ID` 설정
- Measurement ID는 공개되어도 보안상 문제가 없습니다
