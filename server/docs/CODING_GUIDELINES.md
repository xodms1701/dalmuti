# 코딩 가이드라인

달무티 서버 프로젝트의 코딩 규칙 및 모범 사례입니다.

## 📐 TypeScript 규칙

### 1. any 타입 사용 금지 ⛔

**규칙**: `any` 타입을 절대 사용하지 않습니다.

**이유**:
- TypeScript의 타입 안정성을 무력화시킵니다
- 런타임 에러를 발견하지 못하게 합니다
- 코드 리팩토링을 어렵게 만듭니다
- IDE의 자동완성 및 타입 추론을 방해합니다

**대신 사용할 것**:

```typescript
// ❌ 나쁜 예
function processData(data: any) {
  return data.value;
}

// ✅ 좋은 예 1: 명확한 타입 정의
interface Data {
  value: string;
}
function processData(data: Data) {
  return data.value;
}

// ✅ 좋은 예 2: 제네릭 사용
function processData<T extends { value: string }>(data: T) {
  return data.value;
}

// ✅ 좋은 예 3: unknown 사용 (타입을 모를 때)
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}
```

**예외 사항**: 없음. 모든 경우에 `any` 대신 적절한 타입을 사용해야 합니다.

**ESLint 설정**:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### 2. 타입 정의 우선순위

1. **Value Object 사용**: 도메인 개념은 Value Object로 정의
   ```typescript
   // ✅ Card는 Value Object
   const card = Card.create(5, false);
   ```

2. **Interface/Type 정의**: 데이터 구조는 명확한 타입으로 정의
   ```typescript
   // ✅ SelectableDeck은 인터페이스
   interface SelectableDeck {
     cards: Card[];
     isSelected: boolean;
     selectedBy?: string;
   }
   ```

3. **제네릭 활용**: 재사용 가능한 로직은 제네릭으로 구현
   ```typescript
   // ✅ Repository는 제네릭
   interface IRepository<T, ID> {
     findById(id: ID): Promise<T | null>;
     save(entity: T): Promise<void>;
   }
   ```

### 3. null vs undefined

- **함수 반환**: `null` 사용 (명시적인 "값 없음")
- **선택적 필드**: `undefined` 사용 (TypeScript의 옵셔널 문법과 일치)

```typescript
// ✅ 함수 반환
async findById(id: string): Promise<Game | null> {
  const game = await this.repository.findById(id);
  return game ?? null;
}

// ✅ 선택적 필드
interface Player {
  id: string;
  nickname: string;
  role?: number;  // undefined 허용
}
```

## 🏗️ DDD 아키텍처 규칙

### Value Object 판단 기준

다음 **모든** 조건을 만족할 때만 Value Object로 구현:

1. ✅ 불변성: 생성 후 내부 상태가 변경되지 않음
2. ✅ 동등성: 모든 속성이 같으면 같은 객체로 취급
3. ✅ 자체 검증: 생성 시 유효성 검증 수행
4. ✅ 도메인 로직: 도메인 개념을 표현하는 비즈니스 로직 포함

**하나라도 해당하지 않으면 Interface 사용**

참고: [SelectableDeck과 RoleSelectionCard가 VO가 아닌 이유](./architecture/why-selectabledeck-is-not-vo.md)

### Entity vs Value Object

```typescript
// ✅ Entity: 식별자가 있고 생명주기가 있음
class Game {
  private readonly _roomId: RoomId;  // 식별자
  private _players: Player[];        // 가변 상태
  private _phase: Phase;             // 가변 상태
}

// ✅ Value Object: 값으로만 식별되고 불변
class Card {
  private readonly _rank: number;
  private readonly _isJoker: boolean;

  isStrongerThan(other: Card): boolean {
    // 도메인 로직
  }
}

// ✅ Interface: 단순 데이터 구조
interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;  // 가변!
}
```

## 🧪 테스트 규칙

### Value Object 사용

테스트에서도 plain object 대신 Value Object를 사용합니다:

```typescript
// ❌ 나쁜 예
const cards = [
  { rank: 1, isJoker: false },
  { rank: 2, isJoker: false }
];

// ✅ 좋은 예
const cards = [
  Card.create(1, false),
  Card.create(2, false)
];
```

### Mock 데이터

Mock 데이터도 실제 타입을 따라야 합니다:

```typescript
// ✅ 좋은 예
const mockGame = Game.create(RoomId.from('TEST01'));
mockGame.addPlayer(Player.create(PlayerId.create('p1'), 'Alice'));
```

## 📝 네이밍 규칙

### 파일명
- Entity/Value Object: PascalCase (예: `Game.ts`, `Card.ts`)
- Interface: PascalCase, "I" 접두사 (예: `IGameRepository.ts`)
- Service: PascalCase, "Service" 접미사 (예: `DeckService.ts`)
- Test: `*.test.ts` (예: `Game.test.ts`)

### 변수명
- 상수: UPPER_SNAKE_CASE (예: `MAX_PLAYERS`)
- 변수/함수: camelCase (예: `findById`, `currentPlayer`)
- 클래스/인터페이스: PascalCase (예: `Game`, `IRepository`)
- Private 필드: `_` 접두사 (예: `_players`, `_roomId`)

## 🔍 Import 순서

```typescript
// 1. Node.js 내장 모듈
import * as path from 'path';

// 2. 외부 라이브러리
import { MongoClient } from 'mongodb';

// 3. Domain Layer
import { Game } from '../domain/entities/Game';
import { Card } from '../domain/entities/Card';

// 4. Application Layer
import { IGameRepository } from '../application/ports/IGameRepository';

// 5. Infrastructure Layer
import { GameMapper } from '../infrastructure/repositories/GameMapper';

// 6. 타입 정의
import type { GameDocument } from './types';
```

## ✅ 체크리스트

Pull Request 전에 확인:

- [ ] `any` 타입을 사용하지 않았는가?
- [ ] 모든 함수에 명시적 반환 타입이 있는가?
- [ ] Value Object vs Interface를 올바르게 선택했는가?
- [ ] 테스트에서 plain object 대신 Value Object를 사용했는가?
- [ ] ESLint 오류가 없는가?
- [ ] 모든 테스트가 통과하는가?

---

이 가이드라인에 대한 질문이나 제안사항은 팀과 논의해주세요.
