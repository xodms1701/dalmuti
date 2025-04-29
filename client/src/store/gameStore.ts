import { create } from "zustand";
import { Card, Game, GamePhase, UIState } from "../types";

interface GameStore {
  game: Game | null;
  ui: UIState;
  userId: string | null;
  nickname: string | null;
  setGame: (game: Game) => void;
  setUserId: (userId: string) => void;
  setNickname: (nickname: string) => void;
  setMessage: (message: string) => void;
  selectCards: (cards: Card[]) => void;
  selectRole: (role: number) => void;
  selectDeck: (deck: number) => void;
  clearSelection: () => void;
  reset: () => void;
}

const initialState = {
  game: null,
  ui: {
    message: "",
    selectedCards: [],
    selectedRole: null,
    selectedDeck: null,
    isMyTurn: false,
    canPass: false,
    canVote: false,
  },
  userId: null,
  nickname: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setGame: (game) =>
    set((state) => {
      const newState = { ...state, game };
      if (state.userId) {
        newState.ui = {
          ...state.ui,
          isMyTurn: game.currentTurn === state.userId,
          canPass:
            game.currentTurn === state.userId &&
            game.phase === GamePhase.PLAYING,
          canVote: game.isVoting && !game.votes[state.userId],
        };
      }
      return newState;
    }),
  setUserId: (userId) => set({ userId }),
  setNickname: (nickname) => set({ nickname }),
  setMessage: (message) =>
    set((state) => ({
      ui: { ...state.ui, message },
    })),
  selectCards: (selectedCards) =>
    set((state) => ({
      ui: { ...state.ui, selectedCards },
    })),
  selectRole: (selectedRole) =>
    set((state) => ({
      ui: { ...state.ui, selectedRole },
    })),
  selectDeck: (selectedDeck) =>
    set((state) => ({
      ui: { ...state.ui, selectedDeck },
    })),
  clearSelection: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        selectedCards: [],
        selectedRole: null,
        selectedDeck: null,
      },
    })),
  reset: () => set(initialState),
}));
