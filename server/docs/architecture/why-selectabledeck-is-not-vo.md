# SelectableDeck과 RoleSelectionCard가 Value Object가 아닌 이유

## 개요

달무티 프로젝트에서 `SelectableDeck`과 `RoleSelectionCard`는 인터페이스로 정의되어 있으며, Value Object로 구현하지 않았습니다. 이 문서는 이러한 설계 결정의 근거를 설명합니다.

## Value Object vs Data Structure

### Value Object의 특징

Value Object는 DDD(Domain-Driven Design)에서 다음과 같은 특징을 가집니다:

1. **불변성(Immutability)**: 한번 생성되면 내부 상태를 변경할 수 없습니다
2. **동등성(Equality)**: 모든 속성 값이 같으면 같은 객체로 간주됩니다
3. **자체 검증(Self-validation)**: 생성 시 유효성을 검증합니다
4. **도메인 로직**: 도메인 개념을 표현하는 비즈니스 로직을 포함합니다

**프로젝트의 Value Object 예시:**
- `Card`: 카드의 rank와 isJoker는 변경되지 않으며, 카드 비교 로직을 포함
- `RoomId`: 방 ID 형식 검증 및 불변성 보장
- `PlayerId`: 플레이어 ID의 불변성 보장

### SelectableDeck과 RoleSelectionCard의 특징

```typescript
export interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;      // ⚠️ 가변 상태
  selectedBy?: string;       // ⚠️ 가변 상태
}

export interface RoleSelectionCard {
  number: number;
  isSelected: boolean;       // ⚠️ 가변 상태
  selectedBy?: string;       // ⚠️ 가변 상태
}
```

이 두 타입은 다음과 같은 이유로 Value Object가 아닙니다:

## 1. 가변 상태(Mutable State)

### 문제점
- `isSelected`와 `selectedBy` 필드는 게임 진행 중 계속 변경됩니다
- 플레이어가 덱을 선택하면 `isSelected: false → true`, `selectedBy: undefined → 'playerId'`로 변경
- Value Object의 핵심 원칙인 **불변성**을 위반합니다

### 실제 사용 예시
```typescript
// Game.ts에서 SelectableDeck의 상태 변경
selectDeck(playerId: PlayerId, deckIndex: number): void {
  // ...
  this._selectableDecks[deckIndex].isSelected = true;        // 상태 변경!
  this._selectableDecks[deckIndex].selectedBy = playerId.value; // 상태 변경!
  // ...
}
```

만약 Value Object로 만든다면, 매번 새로운 인스턴스를 생성해야 합니다:
```typescript
// 불필요하게 복잡한 코드가 됨
const oldDeck = this._selectableDecks[deckIndex];
this._selectableDecks[deckIndex] = SelectableDeck.create(
  oldDeck.cards,
  true,  // isSelected
  playerId.value  // selectedBy
);
```

## 2. 도메인 개념이 아닌 임시 상태(Transient State)

### SelectableDeck과 RoleSelectionCard는:
- 게임의 특정 페이즈(cardSelection, roleSelection)에서만 존재하는 **임시 데이터 구조**
- 독립적인 도메인 개념이 아니라, `Game` 엔티티 내부의 **상태 추적용 데이터**
- 비즈니스 로직이 없으며, 단순히 상태를 담는 컨테이너 역할

### Game 엔티티와의 관계
```typescript
export class Game {
  // SelectableDeck은 Game의 일부로, 독립적인 생명주기가 없음
  private _selectableDecks?: SelectableDeck[];

  // RoleSelectionCard도 마찬가지
  private _roleSelectionCards?: RoleSelectionCard[];
}
```

## 3. 라이프사이클 차이

### Value Object (Card)
```typescript
// Card는 독립적으로 생성되고, 여러 곳에서 재사용됨
const card1 = Card.create(5, false);
const card2 = Card.create(5, false);
card1.equals(card2); // true - 값이 같으면 동일한 카드
```

### Data Structure (SelectableDeck)
```typescript
// SelectableDeck은 Game 내부에서만 생성되고, 외부로 노출되지 않음
game.setSelectableDecks([
  { cards: [...], isSelected: false }, // 임시 객체
  { cards: [...], isSelected: false }
]);
```

SelectableDeck은:
- Game 엔티티가 생성할 때만 필요
- 특정 페이즈가 끝나면 의미 없어짐
- 다른 곳에서 재사용되지 않음

## 4. 실용성과 복잡도

### Value Object로 만들 경우의 문제점:

```typescript
// 복잡하고 불필요한 코드
class SelectableDeck {
  private readonly _cards: Card[];
  private readonly _isSelected: boolean;
  private readonly _selectedBy?: string;

  private constructor(cards: Card[], isSelected: boolean, selectedBy?: string) {
    this._cards = cards;
    this._isSelected = isSelected;
    this._selectedBy = selectedBy;
  }

  static create(cards: Card[], isSelected: boolean, selectedBy?: string): SelectableDeck {
    // 검증 로직? 없음
    return new SelectableDeck(cards, isSelected, selectedBy);
  }

  // 상태 변경을 위해 매번 새 인스턴스 생성
  withSelected(playerId: string): SelectableDeck {
    return new SelectableDeck(this._cards, true, playerId);
  }

  // getter들...
  get cards(): Card[] { return [...this._cards]; }
  get isSelected(): boolean { return this._isSelected; }
  get selectedBy(): string | undefined { return this._selectedBy; }

  toPlainObject() { /*...*/ }
  static fromPlainObject() { /*...*/ }
}
```

**얻는 것**: 없음 (도메인 로직 없음, 검증 로직 없음)
**잃는 것**: 복잡도 증가, 코드 가독성 감소

### 현재 인터페이스 방식의 장점:

```typescript
// 간단하고 명확한 타입 정의
export interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;
  selectedBy?: string;
}

// 직관적인 사용
game.selectableDecks[0].isSelected = true;
```

## 결론

### SelectableDeck과 RoleSelectionCard를 인터페이스로 유지하는 이유:

1. **가변 상태**: isSelected, selectedBy는 게임 진행 중 변경되어야 함
2. **임시 데이터**: Game 엔티티 내부의 상태 추적용 데이터 구조
3. **도메인 로직 없음**: 검증이나 비즈니스 로직이 필요 없음
4. **실용성**: Value Object로 만들면 복잡도만 증가하고 얻는 게 없음

### DDD 원칙과의 일치:

> "Not everything should be a Value Object. Use Value Objects for concepts that are defined by their attributes and need to be immutable. For mutable state within an entity, simple interfaces or classes are more appropriate."

SelectableDeck과 RoleSelectionCard는 **Game 엔티티 내부의 가변 상태**이므로, 인터페이스로 정의하는 것이 적절합니다.

---

## 관련 코드

- [GameTypes.ts](/src/domain/types/GameTypes.ts) - SelectableDeck, RoleSelectionCard 인터페이스 정의
- [Game.ts](/src/domain/entities/Game.ts) - Game 엔티티에서의 사용
- [Card.ts](/src/domain/entities/Card.ts) - Value Object 예시
