export interface Card {
  rank: number;
  isJoker: boolean;
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

export type GamePhase =
  | 'waiting'
  | 'roleSelection'
  | 'roleSelectionComplete'
  | 'cardSelection'
  | 'playing'
  | 'gameEnd';

export interface RoleSelectionCard {
  number: number;
  isSelected: boolean;
  selectedBy?: string;
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

export interface Database {
  createGame(game: Game): Promise<Game | null>;
  getGame(roomId: string): Promise<Game | null>;
  updateGame(roomId: string, game: Partial<Game>): Promise<Game | null>;
  deleteGame(roomId: string): Promise<boolean>;
}
