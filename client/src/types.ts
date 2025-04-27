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
}

export interface Play {
  playerId: string;
  cards: Card[];
}

export enum GamePhase {
  WAITING = "waiting",
  ROLE_SELECTION = "roleSelection",
  ROLE_SELECTION_COMPLETE = "roleSelectionComplete",
  CARD_SELECTION = "cardSelection",
  PLAYING = "playing",
  GAME_END = "gameEnd",
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
