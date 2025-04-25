import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';
import userReducer from './userSlice';
import roomReducer from './roomSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    user: userReducer,
    room: roomReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 