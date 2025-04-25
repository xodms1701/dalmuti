import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  userId: string | null;
  nickname: string | null;
  currentRoom: string | null;
  isReady: boolean;
}

const initialState: UserState = {
  userId: null,
  nickname: null,
  currentRoom: null,
  isReady: false
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    setNickname: (state, action: PayloadAction<string>) => {
      state.nickname = action.payload;
    },
    setCurrentRoom: (state, action: PayloadAction<string | null>) => {
      state.currentRoom = action.payload;
    },
    setReady: (state, action: PayloadAction<boolean>) => {
      state.isReady = action.payload;
    },
    resetUser: () => initialState
  }
});

export const {
  setUserId,
  setNickname,
  setCurrentRoom,
  setReady,
  resetUser
} = userSlice.actions;

export default userSlice.reducer; 