import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Card, GameState, GamePhase } from '../types';

const initialState: GameState = {
  players: [],
  currentTurn: null,
  lastPlay: null,
  gameStarted: false,
  phase: GamePhase.WAITING,
  firstPlayer: null,
  exchangeCount: 0,
  revolution: false,
  uiState: {
    currentPhase: GamePhase.WAITING,
    message: '',
    exchangeablePlayers: []
  }
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameState: (state, action: PayloadAction<Partial<GameState>>) => {
      return { ...state, ...action.payload };
    },
    setCurrentTurn: (state, action: PayloadAction<string | null>) => {
      state.currentTurn = action.payload;
    },
    setLastPlay: (state, action: PayloadAction<{ playerId: string; cards: Card[] } | null>) => {
      state.lastPlay = action.payload;
    },
    setRevolution: (state, action: PayloadAction<boolean>) => {
      state.revolution = action.payload;
    },
    resetGame: () => initialState
  }
});

export const { setGameState, setCurrentTurn, setLastPlay, setRevolution, resetGame } = gameSlice.actions;
export default gameSlice.reducer; 