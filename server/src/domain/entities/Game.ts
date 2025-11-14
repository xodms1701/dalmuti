/* eslint-disable default-param-last, no-plusplus */
import { Player } from './Player';
import { Card } from './Card';
import { RoomId } from '../value-objects/RoomId';
import { PlayerId } from '../value-objects/PlayerId';
import { SelectableDeck, RoleSelectionCard } from '../types/GameTypes';

/**
 * Game Entity
 *
 * 달무티 게임 전체를 나타내는 도메인 엔티티
 * 게임의 상태와 비즈니스 로직을 캡슐화
 */
export class Game {
  readonly roomId: RoomId;

  private _players: Player[];

  private _phase: string;

  private _currentTurn: PlayerId | null;

  private _lastPlay: { playerId: PlayerId; cards: Card[] } | undefined;

  private _deck: Card[];

  private _round: number;

  private _finishedPlayers: PlayerId[];

  private _selectableDecks?: SelectableDeck[];

  private _roleSelectionCards?: RoleSelectionCard[];

  private _votes: Map<string, boolean>; // playerId → vote (true: 찬성, false: 반대)

  /**
   * Private constructor - factory method를 통해서만 생성 가능
   */
  private constructor(
    roomId: RoomId,
    players: Player[] = [],
    phase: string = 'waiting',
    currentTurn: PlayerId | null = null,
    lastPlay: { playerId: PlayerId; cards: Card[] } | undefined = undefined,
    deck: Card[] = [],
    round: number = 0,
    finishedPlayers: PlayerId[] = [],
    selectableDecks?: SelectableDeck[],
    roleSelectionCards?: RoleSelectionCard[],
    votes: Map<string, boolean> = new Map()
  ) {
    this.roomId = roomId;
    this._players = players;
    this._phase = phase;
    this._currentTurn = currentTurn;
    this._lastPlay = lastPlay;
    this._deck = deck;
    this._round = round;
    this._finishedPlayers = finishedPlayers;
    this._selectableDecks = selectableDecks;
    this._roleSelectionCards = roleSelectionCards;
    this._votes = votes;
  }

  /**
   * Factory method - Game 인스턴스 생성
   * @param roomId 방 ID (RoomId Value Object)
   * @returns Game 인스턴스
   */
  static create(roomId: RoomId): Game {
    return new Game(roomId);
  }

  // Getters
  get players(): Player[] {
    return [...this._players]; // 불변성 보장을 위해 복사본 반환
  }

  get phase(): string {
    return this._phase;
  }

  get currentTurn(): PlayerId | null {
    return this._currentTurn;
  }

  get lastPlay(): { playerId: PlayerId; cards: Card[] } | undefined {
    return this._lastPlay;
  }

  get deck(): Card[] {
    return [...this._deck];
  }

  get round(): number {
    return this._round;
  }

  get finishedPlayers(): PlayerId[] {
    return [...this._finishedPlayers];
  }

  get selectableDecks(): SelectableDeck[] | undefined {
    return this._selectableDecks ? [...this._selectableDecks] : undefined;
  }

  get roleSelectionCards(): RoleSelectionCard[] | undefined {
    return this._roleSelectionCards ? [...this._roleSelectionCards] : undefined;
  }

  /**
   * 플레이어가 카드를 낼 수 있는지 확인
   * @param playerId 플레이어 ID
   * @param cards 낼 카드들
   * @returns 카드를 낼 수 있으면 true
   */
  canPlayCard(playerId: PlayerId, cards: Card[]): boolean {
    // 게임이 플레이 중인지 확인
    if (this._phase !== 'playing') {
      return false;
    }

    // 카드가 비어있는지 확인
    if (!cards || cards.length === 0) {
      return false;
    }

    // 플레이어의 턴인지 확인
    if (!this._currentTurn || !this._currentTurn.equals(playerId)) {
      return false;
    }

    // 플레이어가 이미 게임을 완료했는지 확인
    if (this._finishedPlayers.some((fp) => fp.equals(playerId))) {
      return false;
    }

    // 플레이어가 패스했는지 확인
    const player = this._players.find((p) => p.id.equals(playerId));
    if (player && player.isPassed) {
      return false;
    }

    // lastPlay가 있는 경우, 같은 장수의 카드를 내야 함
    if (this._lastPlay) {
      if (cards.length !== this._lastPlay.cards.length) {
        return false;
      }

      // 카드가 lastPlay보다 강해야 함 (낮은 숫자가 더 강함)
      const lastPlayRank = this._lastPlay.cards[0].rank;
      const currentRank = cards[0].rank;

      // 조커 처리: 조커는 와일드카드이므로 별도 처리 필요
      // 현재는 기본 검증만 수행
      if (currentRank > lastPlayRank) {
        // 더 약한 카드는 낼 수 없음
        return false;
      }
    }

    return true;
  }

  /**
   * 게임이 종료되었는지 확인
   * @returns 게임이 종료되었으면 true
   */
  isGameOver(): boolean {
    // 활성 플레이어가 1명 이하면 게임 종료
    const activePlayers = this._players.filter(
      (p) => !this._finishedPlayers.some((fp) => fp.equals(p.id))
    );
    return activePlayers.length <= 1;
  }

  /**
   * 특정 플레이어의 턴인지 확인
   * @param playerId 플레이어 ID
   * @returns 해당 플레이어의 턴이면 true
   */
  isPlayerTurn(playerId: PlayerId): boolean {
    return this._currentTurn !== null && this._currentTurn.equals(playerId);
  }

  /**
   * 활성 플레이어 수 반환 (게임을 완료하지 않은 플레이어)
   * @returns 활성 플레이어 수
   */
  getActivePlayerCount(): number {
    return this._players.filter((p) => !this._finishedPlayers.some((fp) => fp.equals(p.id))).length;
  }

  /**
   * 플레이어 추가
   * @param player 추가할 플레이어
   */
  addPlayer(player: Player): void {
    if (this._players.some((p) => p.id.equals(player.id))) {
      throw new Error('Player already exists in the game');
    }
    this._players.push(player);
  }

  /**
   * 플레이어 제거
   * @param playerId 제거할 플레이어 ID
   */
  removePlayer(playerId: PlayerId): void {
    const index = this._players.findIndex((p) => p.id.equals(playerId));
    if (index === -1) {
      throw new Error('Player not found');
    }
    this._players.splice(index, 1);
  }

  /**
   * 플레이어 찾기
   * @param playerId 플레이어 ID
   * @returns Player 인스턴스 또는 undefined
   */
  getPlayer(playerId: PlayerId): Player | undefined {
    return this._players.find((p) => p.id.equals(playerId));
  }

  /**
   * 페이즈 변경
   * @param phase 새로운 페이즈
   */
  changePhase(phase: string): void {
    this._phase = phase;
  }

  /**
   * 현재 턴 설정
   * @param playerId 플레이어 ID
   */
  setCurrentTurn(playerId: PlayerId | null): void {
    this._currentTurn = playerId;
  }

  /**
   * 마지막 플레이 설정
   * @param play 플레이 정보
   */
  setLastPlay(play: { playerId: PlayerId; cards: Card[] } | undefined): void {
    this._lastPlay = play;
  }

  /**
   * 라운드 증가
   */
  incrementRound(): void {
    this._round++;
  }

  /**
   * 플레이어를 완료 목록에 추가
   * @param playerId 플레이어 ID
   */
  addFinishedPlayer(playerId: PlayerId): void {
    if (!this._finishedPlayers.some((fp) => fp.equals(playerId))) {
      this._finishedPlayers.push(playerId);
    }
  }

  /**
   * 덱 설정
   * @param deck 카드 덱
   */
  setDeck(deck: Card[]): void {
    this._deck = [...deck];
  }

  /**
   * 선택 가능한 덱 설정
   * @param decks 선택 가능한 덱들
   */
  setSelectableDecks(decks: SelectableDeck[]): void {
    this._selectableDecks = [...decks];
  }

  /**
   * 역할 선택 카드 설정
   * @param cards 역할 선택 카드들
   */
  setRoleSelectionCards(cards: RoleSelectionCard[]): void {
    this._roleSelectionCards = [...cards];
  }

  /**
   * 플레이어가 역할을 선택
   * @param playerId 플레이어 ID
   * @param roleNumber 선택할 역할 번호 (1-13)
   * @returns 모든 플레이어가 역할을 선택했는지 여부
   * @throws Error 게임 페이즈가 roleSelection이 아닌 경우
   * @throws Error 플레이어를 찾을 수 없는 경우
   * @throws Error 플레이어가 이미 역할을 선택한 경우
   * @throws Error 역할 번호가 유효하지 않은 경우
   * @throws Error 역할이 이미 선택된 경우
   */
  selectRole(playerId: PlayerId, roleNumber: number): boolean {
    // 페이즈 확인
    if (this._phase !== 'roleSelection') {
      throw new Error('Cannot select role. Game is not in roleSelection phase');
    }

    // 역할 번호 유효성 확인
    if (roleNumber < 1 || roleNumber > 13) {
      throw new Error(`Role number must be between 1 and 13. Received: ${roleNumber}`);
    }

    // 플레이어 찾기
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 플레이어가 이미 역할을 선택했는지 확인
    if (player.role !== null) {
      throw new Error('Player has already selected a role');
    }

    // 역할 선택 카드가 있는지 확인
    if (!this._roleSelectionCards || this._roleSelectionCards.length === 0) {
      throw new Error('No role selection cards available');
    }

    // 선택한 역할 카드 찾기
    const roleCard = this._roleSelectionCards.find((card) => card.number === roleNumber);
    if (!roleCard) {
      throw new Error(`Role card with number ${roleNumber} not found`);
    }

    // 이미 선택된 역할인지 확인
    if (roleCard.isSelected) {
      throw new Error(`Role ${roleNumber} has already been selected`);
    }

    // 역할 선택 처리
    roleCard.isSelected = true;
    roleCard.selectedBy = playerId.value;
    player.assignRole(roleNumber);

    // 모든 플레이어가 역할을 선택했는지 확인
    const allRolesSelected = this._players.every((p) => p.role !== null);

    return allRolesSelected;
  }

  /**
   * 플레이어가 덱을 선택
   * @param playerId 플레이어 ID
   * @param deckIndex 선택할 덱 인덱스
   * @returns 선택된 덱
   * @throws Error 게임 페이즈가 cardSelection이 아닌 경우
   * @throws Error 플레이어의 턴이 아닌 경우
   * @throws Error 덱 인덱스가 유효하지 않은 경우
   * @throws Error 이미 선택된 덱인 경우
   * @throws Error 플레이어를 찾을 수 없는 경우
   */
  selectDeck(playerId: PlayerId, deckIndex: number): SelectableDeck {
    // 페이즈 확인
    if (this._phase !== 'cardSelection') {
      throw new Error('Cannot select deck. Game is not in cardSelection phase');
    }

    // 턴 확인
    if (!this._currentTurn || !this._currentTurn.equals(playerId)) {
      throw new Error('Not player turn');
    }

    // 선택 가능한 덱이 있는지 확인
    if (!this._selectableDecks || this._selectableDecks.length === 0) {
      throw new Error('No selectable decks available');
    }

    // 덱 인덱스 유효성 확인
    if (deckIndex < 0 || deckIndex >= this._selectableDecks.length) {
      throw new Error(`Invalid deck index: ${deckIndex}`);
    }

    const selectedDeck = this._selectableDecks[deckIndex];

    // 이미 선택된 덱인지 확인
    if (selectedDeck.isSelected) {
      throw new Error('Deck already selected');
    }

    // 플레이어 찾기
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // 덱 선택 처리
    selectedDeck.isSelected = true;
    selectedDeck.selectedBy = playerId.value;

    // 플레이어에게 카드 추가
    player.addCards(selectedDeck.cards);

    // 선택된 덱 반환
    return selectedDeck;
  }

  /**
   * 다음 게임 진행에 대한 투표 등록
   * @param playerId 투표하는 플레이어 ID
   * @param vote 투표 (true: 찬성, false: 반대)
   * @throws Error 플레이어가 게임에 없는 경우
   */
  registerVote(playerId: PlayerId, vote: boolean): void {
    // 플레이어 존재 확인
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found in game');
    }

    // 투표 등록
    this._votes.set(playerId.value, vote);
  }

  /**
   * 투표 결과 조회
   * @returns { allVoted: boolean, approved: boolean, approvalCount: number, rejectionCount: number }
   */
  getVoteResult(): {
    allVoted: boolean;
    approved: boolean;
    approvalCount: number;
    rejectionCount: number;
  } {
    const totalPlayers = this._players.length;
    const votedCount = this._votes.size;

    let approvalCount = 0;
    let rejectionCount = 0;

    for (const vote of this._votes.values()) {
      if (vote) {
        approvalCount++;
      } else {
        rejectionCount++;
      }
    }

    const allVoted = votedCount === totalPlayers && totalPlayers > 0;
    const approved = allVoted && rejectionCount === 0;

    return {
      allVoted,
      approved,
      approvalCount,
      rejectionCount,
    };
  }

  /**
   * 다음 게임 시작
   * 라운드 증가, 페이즈 변경, 플레이어 및 투표 상태 초기화
   */
  startNextGame(): void {
    // 라운드 증가
    this._round++;

    // 페이즈 변경
    this._phase = 'roleSelection';

    // 플레이어 상태 초기화
    for (const player of this._players) {
      player.unready();
      player.resetPass();
    }

    // 투표 초기화
    this._votes.clear();

    // 게임 상태 초기화 (필요시 추가)
    this._currentTurn = null;
    this._lastPlay = undefined;
    this._finishedPlayers = [];
  }

  /**
   * 게임 종료 처리
   */
  endGame(): void {
    this._phase = 'gameEnd';
  }

  /**
   * 게임 상태를 플레인 객체로 변환
   */
  toPlainObject(): {
    roomId: string;
    players: ReturnType<Player['toPlainObject']>[];
    phase: string;
    currentTurn: string | null;
    lastPlay: { playerId: string; cards: ReturnType<Card['toPlainObject']>[] } | undefined;
    deck: ReturnType<Card['toPlainObject']>[];
    round: number;
    finishedPlayers: string[];
    selectableDecks?: Array<{
      cards: ReturnType<Card['toPlainObject']>[];
      isSelected: boolean;
      selectedBy?: string;
    }>;
    roleSelectionCards?: RoleSelectionCard[];
    votes: Record<string, boolean>;
  } {
    // Map을 Record로 변환
    const votesRecord: Record<string, boolean> = Object.fromEntries(this._votes);

    return {
      roomId: this.roomId.value, // RoomId를 string으로 변환
      players: this._players.map((p) => p.toPlainObject()),
      phase: this._phase,
      currentTurn: this._currentTurn ? this._currentTurn.value : null, // PlayerId를 string으로 변환
      lastPlay: this._lastPlay
        ? {
            playerId: this._lastPlay.playerId.value, // PlayerId를 string으로 변환
            cards: this._lastPlay.cards.map((c) => c.toPlainObject()), // Card[]를 plain object로 변환
          }
        : undefined,
      deck: this._deck.map((c) => c.toPlainObject()), // Card[]를 plain object로 변환
      round: this._round,
      finishedPlayers: this._finishedPlayers.map((fp) => fp.value), // PlayerId[]를 string[]로 변환
      selectableDecks: this._selectableDecks
        ? this._selectableDecks.map((deck) => ({
            cards: deck.cards.map((c) => c.toPlainObject()), // Card[]를 plain object로 변환
            isSelected: deck.isSelected,
            selectedBy: deck.selectedBy,
          }))
        : undefined,
      roleSelectionCards: this._roleSelectionCards,
      votes: votesRecord,
    };
  }

  /**
   * 플레인 객체로부터 Game 인스턴스 생성
   */
  static fromPlainObject(obj: {
    roomId: string;
    players?: ReturnType<Player['toPlainObject']>[];
    phase?: string;
    currentTurn?: string | null;
    lastPlay?: { playerId: string; cards: ReturnType<Card['toPlainObject']>[] };
    deck?: ReturnType<Card['toPlainObject']>[];
    round?: number;
    finishedPlayers?: string[];
    selectableDecks?: Array<{
      cards: ReturnType<Card['toPlainObject']>[];
      isSelected: boolean;
      selectedBy?: string;
    }>;
    roleSelectionCards?: RoleSelectionCard[];
    votes?: Record<string, boolean>;
  }): Game {
    const players = obj.players ? obj.players.map((p) => Player.fromPlainObject(p)) : [];

    const roomId = RoomId.from(obj.roomId); // string을 RoomId로 변환
    const currentTurn = obj.currentTurn ? PlayerId.create(obj.currentTurn) : null; // string을 PlayerId로 변환
    const lastPlay = obj.lastPlay
      ? {
          playerId: PlayerId.create(obj.lastPlay.playerId), // string을 PlayerId로 변환
          cards: obj.lastPlay.cards.map((c) => Card.fromPlainObject(c)), // plain object를 Card[]로 변환
        }
      : undefined;
    const finishedPlayers = obj.finishedPlayers
      ? obj.finishedPlayers.map((fp) => PlayerId.create(fp)) // string[]을 PlayerId[]로 변환
      : [];
    const deck = obj.deck
      ? obj.deck.map((c) => Card.fromPlainObject(c)) // plain object를 Card[]로 변환
      : [];
    const selectableDecks = obj.selectableDecks
      ? obj.selectableDecks.map((d) => ({
          cards: d.cards.map((c) => Card.fromPlainObject(c)), // plain object를 Card[]로 변환
          isSelected: d.isSelected,
          selectedBy: d.selectedBy,
        }))
      : undefined;

    // Record를 Map으로 변환
    const votes = new Map<string, boolean>(Object.entries(obj.votes ?? {}));

    return new Game(
      roomId,
      players,
      obj.phase || 'waiting',
      currentTurn,
      lastPlay,
      deck,
      obj.round || 0,
      finishedPlayers,
      selectableDecks,
      obj.roleSelectionCards,
      votes
    );
  }
}
