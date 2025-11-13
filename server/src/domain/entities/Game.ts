import { Player } from './Player';

/**
 * Game Entity
 *
 * 달무티 게임 전체를 나타내는 도메인 엔티티
 * 게임의 상태와 비즈니스 로직을 캡슐화
 */
export class Game {
  readonly roomId: string;
  private _players: Player[];
  private _phase: string;
  private _currentTurn: string | null;
  private _lastPlay: { playerId: string; cards: any[] } | undefined;
  private _deck: any[];
  private _round: number;
  private _finishedPlayers: string[];
  private _selectableDecks?: any[];
  private _roleSelectionCards?: any[];

  /**
   * Private constructor - factory method를 통해서만 생성 가능
   */
  private constructor(
    roomId: string,
    players: Player[] = [],
    phase: string = 'waiting',
    currentTurn: string | null = null,
    lastPlay: { playerId: string; cards: any[] } | undefined = undefined,
    deck: any[] = [],
    round: number = 0,
    finishedPlayers: string[] = [],
    selectableDecks?: any[],
    roleSelectionCards?: any[]
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
  }

  /**
   * Factory method - Game 인스턴스 생성
   * @param roomId 방 ID
   * @returns Game 인스턴스
   */
  static create(roomId: string): Game {
    if (!roomId || roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    return new Game(roomId);
  }

  // Getters
  get players(): Player[] {
    return [...this._players]; // 불변성 보장을 위해 복사본 반환
  }

  get phase(): string {
    return this._phase;
  }

  get currentTurn(): string | null {
    return this._currentTurn;
  }

  get lastPlay(): { playerId: string; cards: any[] } | undefined {
    return this._lastPlay;
  }

  get deck(): any[] {
    return [...this._deck];
  }

  get round(): number {
    return this._round;
  }

  get finishedPlayers(): string[] {
    return [...this._finishedPlayers];
  }

  get selectableDecks(): any[] | undefined {
    return this._selectableDecks ? [...this._selectableDecks] : undefined;
  }

  get roleSelectionCards(): any[] | undefined {
    return this._roleSelectionCards ? [...this._roleSelectionCards] : undefined;
  }

  /**
   * 플레이어가 카드를 낼 수 있는지 확인
   * @param playerId 플레이어 ID
   * @param cards 낼 카드들
   * @returns 카드를 낼 수 있으면 true
   */
  canPlayCard(playerId: string, cards: any[]): boolean {
    // 게임이 플레이 중인지 확인
    if (this._phase !== 'playing') {
      return false;
    }

    // 카드가 비어있는지 확인
    if (!cards || cards.length === 0) {
      return false;
    }

    // 플레이어의 턴인지 확인
    if (this._currentTurn !== playerId) {
      return false;
    }

    // 플레이어가 이미 게임을 완료했는지 확인
    if (this._finishedPlayers.includes(playerId)) {
      return false;
    }

    // 플레이어가 패스했는지 확인
    const player = this._players.find((p) => p.id === playerId);
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
      (p) => !this._finishedPlayers.includes(p.id)
    );
    return activePlayers.length <= 1;
  }

  /**
   * 특정 플레이어의 턴인지 확인
   * @param playerId 플레이어 ID
   * @returns 해당 플레이어의 턴이면 true
   */
  isPlayerTurn(playerId: string): boolean {
    return this._currentTurn === playerId;
  }

  /**
   * 활성 플레이어 수 반환 (게임을 완료하지 않은 플레이어)
   * @returns 활성 플레이어 수
   */
  getActivePlayerCount(): number {
    return this._players.filter((p) => !this._finishedPlayers.includes(p.id))
      .length;
  }

  /**
   * 플레이어 추가
   * @param player 추가할 플레이어
   */
  addPlayer(player: Player): void {
    if (this._players.some((p) => p.id === player.id)) {
      throw new Error('Player already exists in the game');
    }
    this._players.push(player);
  }

  /**
   * 플레이어 제거
   * @param playerId 제거할 플레이어 ID
   */
  removePlayer(playerId: string): void {
    const index = this._players.findIndex((p) => p.id === playerId);
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
  getPlayer(playerId: string): Player | undefined {
    return this._players.find((p) => p.id === playerId);
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
  setCurrentTurn(playerId: string | null): void {
    this._currentTurn = playerId;
  }

  /**
   * 마지막 플레이 설정
   * @param play 플레이 정보
   */
  setLastPlay(play: { playerId: string; cards: any[] } | undefined): void {
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
  addFinishedPlayer(playerId: string): void {
    if (!this._finishedPlayers.includes(playerId)) {
      this._finishedPlayers.push(playerId);
    }
  }

  /**
   * 덱 설정
   * @param deck 카드 덱
   */
  setDeck(deck: any[]): void {
    this._deck = [...deck];
  }

  /**
   * 선택 가능한 덱 설정
   * @param decks 선택 가능한 덱들
   */
  setSelectableDecks(decks: any[]): void {
    this._selectableDecks = [...decks];
  }

  /**
   * 역할 선택 카드 설정
   * @param cards 역할 선택 카드들
   */
  setRoleSelectionCards(cards: any[]): void {
    this._roleSelectionCards = [...cards];
  }

  /**
   * 게임 상태를 플레인 객체로 변환
   */
  toPlainObject(): {
    roomId: string;
    players: any[];
    phase: string;
    currentTurn: string | null;
    lastPlay: { playerId: string; cards: any[] } | undefined;
    deck: any[];
    round: number;
    finishedPlayers: string[];
    selectableDecks?: any[];
    roleSelectionCards?: any[];
  } {
    return {
      roomId: this.roomId,
      players: this._players.map((p) => p.toPlainObject()),
      phase: this._phase,
      currentTurn: this._currentTurn,
      lastPlay: this._lastPlay,
      deck: [...this._deck],
      round: this._round,
      finishedPlayers: [...this._finishedPlayers],
      selectableDecks: this._selectableDecks,
      roleSelectionCards: this._roleSelectionCards,
    };
  }

  /**
   * 플레인 객체로부터 Game 인스턴스 생성
   */
  static fromPlainObject(obj: {
    roomId: string;
    players?: any[];
    phase?: string;
    currentTurn?: string | null;
    lastPlay?: { playerId: string; cards: any[] };
    deck?: any[];
    round?: number;
    finishedPlayers?: string[];
    selectableDecks?: any[];
    roleSelectionCards?: any[];
  }): Game {
    const players = obj.players
      ? obj.players.map((p) => Player.fromPlainObject(p))
      : [];

    return new Game(
      obj.roomId,
      players,
      obj.phase || 'waiting',
      obj.currentTurn || null,
      obj.lastPlay,
      obj.deck || [],
      obj.round || 0,
      obj.finishedPlayers || [],
      obj.selectableDecks,
      obj.roleSelectionCards
    );
  }
}
