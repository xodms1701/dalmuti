import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RoomState {
  roomCode: string | null;
  roomName: string | null;
}

const initialState: RoomState = {
  roomCode: null,
  roomName: null
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoomCode: (state, action: PayloadAction<string>) => {
      state.roomCode = action.payload;
    },
    setRoomName: (state, action: PayloadAction<string>) => {
      state.roomName = action.payload;
    },
    resetRoom: () => initialState
  }
});

export const { setRoomCode, setRoomName, resetRoom } = roomSlice.actions;
export default roomSlice.reducer; 