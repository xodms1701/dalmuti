# Socket Interface Compatibility Analysis

## 목적
Phase 4에서 Hexagonal Architecture로 리팩토링한 신규 아키텍처가 기존 Legacy 서버와 **완전히 동일한 클라이언트 인터페이스**를 제공하는지 검증합니다.

클라이언트 코드 수정 없이 서버만 교체 가능해야 합니다.

---

## 📊 Socket 이벤트 비교

### Legacy (socket/SocketManager.ts)
```typescript
GET_GAME_STATE      ✅
CREATE_GAME         ✅
JOIN_GAME           ✅
READY               ✅ (+ ALL_PLAYERS_READY 브로드캐스트)
START_GAME          ❌ 누락
SELECT_ROLE         ✅
SELECT_DECK         ✅
SELECT_REVOLUTION   ❌ 누락
PLAY_CARD           ✅
PASS                ✅
VOTE                ✅
disconnect          ✅
```

### New (src/presentation/socket/adapters/)
```typescript
GET_GAME_STATE      ✅
CREATE_GAME         ✅
JOIN_GAME           ✅
LEAVE_GAME          ✅ (신규 추가)
READY               ✅ (자동 시작 로직)
SELECT_ROLE         ✅
SELECT_DECK         ✅
PLAY_CARD           ✅
PASS                ✅
VOTE                ✅
disconnect          ✅ (자동 LEAVE_GAME 처리)
```

---

## 🚨 Breaking Changes

### 1. ✅ FIXED: GAME_STATE_UPDATED 브로드캐스트 형식

#### Legacy
```typescript
this.io.to(roomId).emit('GAME_STATE_UPDATED', gameState);
```

#### New (Before Fix)
```typescript
this.io.to(roomId).emit('GAME_STATE_UPDATED', { game: gameState });
// ❌ Breaking Change!
```

#### New (After Fix)
```typescript
this.io.to(roomId).emit('GAME_STATE_UPDATED', gameState);
// ✅ Compatible!
```

**Status**: ✅ Fixed in BaseEventAdapter.ts

---

### 2. ❌ MISSING: START_GAME 이벤트

#### Legacy 동작
```typescript
socket.on(SocketEvent.READY, async ({ roomId, playerId }, callback) => {
  const game = await gameManager.setPlayerReady(roomId, playerId);

  // 모든 플레이어가 준비되면 브로드캐스트
  const allReady = game.players.every((p) => p.isReady);
  if (allReady && game.players.length >= 2) {
    this.io.to(roomId).emit(SocketEvent.ALL_PLAYERS_READY);
  }

  callback({ success: true });
  this.emitGameState(roomId);
});

// 별도의 START_GAME 이벤트로 수동 시작
socket.on(SocketEvent.START_GAME, async ({ roomId }, callback) => {
  const success = await gameManager.startGame(roomId);
  if (!success) {
    callback({ success: false, error: '게임을 시작할 수 없습니다.' });
    return;
  }
  callback({ success: true });
  this.emitGameState(roomId);
});
```

#### New 동작
```typescript
// toggleReadyAndCheckStart - 모든 플레이어가 준비되면 자동 시작
socket.on(SocketEvent.READY, async ({ roomId }, callback) => {
  const result = await commandService.toggleReadyAndCheckStart(roomId, socket.id);

  await handleSocketEvent(result, callback, roomId);
  // ❌ ALL_PLAYERS_READY 브로드캐스트 없음
  // ✅ 자동 시작 (수동 START_GAME 불필요)
});
```

**Impact**:
- ❌ `START_GAME` 이벤트가 없어서 클라이언트가 수동으로 게임을 시작할 수 없음
- ❌ `ALL_PLAYERS_READY` 브로드캐스트가 없어서 클라이언트가 모든 플레이어 준비 완료를 감지할 수 없음

**Required Action**:
1. `START_GAME` 이벤트 핸들러 추가 필요
2. `ALL_PLAYERS_READY` 브로드캐스트 추가 필요
3. 또는 클라이언트 로직 변경 (자동 시작 방식으로)

---

### 3. ❌ MISSING: SELECT_REVOLUTION 이벤트

#### Legacy
```typescript
socket.on(SocketEvent.SELECT_REVOLUTION, async (
  { roomId, playerId, wantRevolution },
  callback
) => {
  const success = await gameManager.selectRevolution(
    roomId,
    playerId,
    wantRevolution
  );
  if (!success) {
    callback({ success: false, error: '혁명 선택에 실패했습니다.' });
    return;
  }
  callback({ success: true });
  this.emitGameState(roomId);
});
```

#### New
```typescript
// ❌ SELECT_REVOLUTION 이벤트 핸들러 없음
// ❌ SelectRevolutionUseCase 없음
```

**Impact**:
- ❌ 혁명 선택 기능을 사용하는 클라이언트가 작동하지 않음

**Required Action**:
1. `SelectRevolutionUseCase` 추가
2. `RoleSelectionEventAdapter`에 `SELECT_REVOLUTION` 핸들러 추가
3. GameCommandService에 메서드 추가

---

## ✅ 추가된 기능 (Backward Compatible)

### 1. LEAVE_GAME 이벤트

#### New
```typescript
socket.on(SocketEvent.LEAVE_GAME, async ({ roomId }, callback) => {
  const result = await commandService.leaveGame(roomId, socket.id);

  await handleSocketEvent(result, callback, roomId, async () => {
    socket.leave(roomId);
    playerRooms.delete(socket.id);
  });
});
```

**Impact**: ✅ 클라이언트가 호출하지 않으면 영향 없음 (Backward Compatible)

**Benefit**: 플레이어가 명시적으로 게임을 나갈 수 있음

---

### 2. disconnect 자동 처리

#### Legacy
```typescript
socket.on('disconnect', () => {
  console.log('클라이언트가 연결을 끊었습니다:', socket.id);
  // ❌ 아무 처리도 하지 않음
});
```

#### New
```typescript
socket.on('disconnect', async () => {
  const roomId = playerRooms.get(socket.id);
  if (roomId) {
    try {
      const result = await commandService.leaveGame(roomId, socket.id);
      if (result.success) {
        await emitGameState(roomId);
      }
    } catch (error) {
      console.error('Disconnect 처리 중 오류:', error);
    }
  }
});
```

**Impact**: ✅ 개선 (플레이어가 비정상 종료해도 게임에서 자동 제거)

---

## 📝 Request/Response 형식 비교

### Request 페이로드

#### READY 이벤트 차이

**Legacy**:
```typescript
{ roomId: string; playerId: string }
```

**New**:
```typescript
{ roomId: string }
// socket.id를 자동으로 사용
```

**Impact**:
- ⚠️ 클라이언트가 `playerId` 필드를 보내도 무시됨
- ✅ 하지만 에러는 발생하지 않음 (Backward Compatible)

#### SELECT_ROLE 이벤트 차이

**Legacy**:
```typescript
{ roomId: string; playerId: string; roleNumber: number }
```

**New**:
```typescript
{ roomId: string; roleNumber: number }
// socket.id를 자동으로 사용
```

**Impact**: 동일

#### PLAY_CARD 이벤트 차이

**Legacy**:
```typescript
{ roomId: string; playerId: string; cards: Card[] }
```

**New**:
```typescript
{ roomId: string; cards: Card[] }
// socket.id를 자동으로 사용
```

**Impact**: 동일

#### PASS 이벤트 차이

**Legacy**:
```typescript
{ roomId: string; playerId: string }
```

**New**:
```typescript
{ roomId: string }
// socket.id를 자동으로 사용
```

**Impact**: 동일

**Summary**:
- ✅ playerId를 명시적으로 보내지 않아도 동작함 (socket.id 사용)
- ✅ 클라이언트가 playerId를 보내도 무시될 뿐 에러는 없음

---

### Response 형식

#### 모든 이벤트 공통

**Legacy**:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

**New**:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

**Impact**: ✅ 완전히 동일

#### CREATE_GAME Response Data

**Legacy**:
```typescript
{
  success: true,
  data: { roomId: string; nickname: string }
}
```

**New**:
```typescript
{
  success: true,
  data: { roomId: string; playerId: string; playerCount: number }
}
```

**Impact**:
- ⚠️ 필드명이 다름 (`nickname` → `playerId`, `playerCount` 추가)
- ⚠️ 클라이언트가 `nickname` 필드를 참조하면 undefined

**Required Action**: Response DTO 형식 통일 필요

---

## 🎯 호환성 요약

### ✅ Compatible (수정 완료)
- [x] GAME_STATE_UPDATED 브로드캐스트 형식
- [x] Response 형식 (success/data/error)
- [x] 대부분의 이벤트 핸들러

### ⚠️ Partially Compatible
- [ ] playerId 파라미터 (보내도 무시될 뿐 에러 없음)
- [ ] CREATE_GAME response data 필드명

### ❌ Breaking Changes (수정 필요)
- [ ] START_GAME 이벤트 누락
- [ ] ALL_PLAYERS_READY 브로드캐스트 누락
- [ ] SELECT_REVOLUTION 이벤트 누락

---

## 📋 조치 필요 사항

### High Priority (클라이언트가 사용 중인 기능)
1. **START_GAME 이벤트 추가**
   - Use Case: StartGameUseCase (이미 존재하는지 확인 필요)
   - Adapter: GameEventAdapter에 핸들러 추가

2. **ALL_PLAYERS_READY 브로드캐스트 추가**
   - ReadyGameUseCase에서 조건 체크
   - 모든 플레이어 준비 완료 시 브로드캐스트

3. **SELECT_REVOLUTION 이벤트 추가**
   - Use Case: SelectRevolutionUseCase 구현
   - Adapter: RoleSelectionEventAdapter에 핸들러 추가

### Medium Priority (데이터 형식 통일)
4. **CREATE_GAME Response 형식 통일**
   - Legacy: `{ roomId, nickname }`
   - New: `{ roomId, playerId, playerCount }`
   - 결정 필요: 어느 형식을 사용할지

### Low Priority (개선 사항)
5. **문서화**
   - Socket 이벤트 API 명세서 작성
   - 클라이언트-서버 인터페이스 계약 문서화

---

## 🧪 검증 계획

### 1. Unit Tests
- [ ] 각 Adapter의 이벤트 핸들러 테스트
- [ ] Response 형식 검증 테스트

### 2. Integration Tests
- [ ] Legacy SocketManager vs New SocketCoordinator 동작 비교
- [ ] 동일한 입력에 대한 동일한 출력 검증

### 3. E2E Tests
- [ ] 전체 게임 플로우 테스트
  - 대기실 → 준비 → 시작 → 역할 선택 → 카드 선택 → 게임 플레이 → 종료
- [ ] 멀티플레이어 시나리오
- [ ] 에러 케이스

### 4. Client Compatibility Tests
- [ ] 기존 클라이언트 코드와 연동 테스트
- [ ] Breaking Change 없이 서버 교체 가능 검증

---

## 📅 작업 우선순위

1. **즉시** (Phase 5-1): Breaking Changes 수정
   - START_GAME 이벤트 추가
   - ALL_PLAYERS_READY 브로드캐스트 추가
   - SELECT_REVOLUTION 이벤트 추가

2. **Phase 5-1**: E2E 테스트 작성 및 검증
   - 전체 게임 플로우 테스트
   - 클라이언트 호환성 검증

3. **Phase 5-2**: 마이그레이션 완료
   - Legacy 코드 제거
   - 문서화 완료

---

**작성일**: 2025-11-15
**작성자**: Claude Code
**검토 필요**: 모든 Breaking Changes 수정 후 재검증
