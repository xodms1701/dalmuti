export enum Role {
  KING = "왕",
  QUEEN = "여왕",
  PRINCE = "왕자",
  PRINCESS = "공주",
  DUKE = "공작",
  DUCHESS = "공작부인",
  KNIGHT = "기사",
  SERF = "농노",
}

export interface Card {
  rank: number;
  isJoker: boolean;
}

export interface RoleSelectionCard {
  number: number;
  isSelected: boolean;
  selectedBy?: string;
}

export interface SelectableDeck {
  cards: Card[];
  isSelected: boolean;
  selectedBy?: string;
}

export interface Player {
  id: string;
  nickname: string;
  cards: Card[];
  role: number | null;
  rank: number | null;
  isPassed: boolean;
  isReady: boolean;
  selectableDeck?: Card[];
  hasDoubleJoker?: boolean;
  revolutionChoice?: boolean;
}

export interface Play {
  playerId: string;
  cards: Card[];
}

export interface RoundPlay {
  round: number;
  playerId: string;
  cards: Card[];
  timestamp: Date;
}

export interface GameHistory {
  gameNumber: number;
  players: {
    playerId: string;
    nickname: string;
    rank: number;
    finishedAtRound: number;
    totalCardsPlayed: number;
    totalPasses: number;
  }[];
  finishedOrder: string[];
  totalRounds: number;
  roundPlays: RoundPlay[];
  startedAt: Date;
  endedAt: Date;
}

export enum GamePhase {
  WAITING = "waiting",
  ROLE_SELECTION = "roleSelection",
  ROLE_SELECTION_COMPLETE = "roleSelectionComplete",
  CARD_SELECTION = "cardSelection",
  REVOLUTION = "revolution",
  TAX = "tax",
  PLAYING = "playing",
  GAME_END = "gameEnd",
}

export interface TaxExchange {
  fromPlayerId: string;
  toPlayerId: string;
  cardCount: number;
  cardsGiven: Card[];
}

export interface Game {
  roomId: string;
  ownerId: string;
  players: Player[];
  phase: GamePhase;
  currentTurn: string | null;
  lastPlay?: Play;
  deck: Card[];
  round: number;
  roleSelectionDeck: RoleSelectionCard[];
  selectableDecks: {
    cards: Card[];
    isSelected: boolean;
    selectedBy?: string;
  }[];
  isVoting: boolean;
  votes: Record<string, boolean>;
  nextGameVotes: Record<string, boolean>;
  finishedPlayers: string[];
  createdAt: Date;
  updatedAt: Date;
  gameNumber: number;
  gameHistories: GameHistory[];
  currentGameStartedAt?: Date;
  playerStats: Record<string, {
    nickname: string;
    totalCardsPlayed: number;
    totalPasses: number;
    finishedAtRound: number;
  }>;
  roundPlays: RoundPlay[];
  revolutionStatus?: {
    isRevolution: boolean;
    isGreatRevolution: boolean;
    revolutionPlayerId?: string;
  };
  taxExchanges?: TaxExchange[];
}

export interface UIState {
  message: string;
  selectedCards: Card[];
  selectedRole: number | null;
  selectedDeck: number | null;
  isMyTurn: boolean;
  canPass: boolean;
  canVote: boolean;
}

export interface GameState {
  game: Game;
  uiState: UIState;
}

export interface UserState {
  userId: string;
  nickname: string;
}

export interface RoomState {
  roomCode: string | null;
  roomName: string | null;
}
