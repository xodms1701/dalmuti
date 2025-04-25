import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  code: string;
  name: string;
  host: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  host: { type: String, required: true },
  players: [{ type: String }],
  maxPlayers: { type: Number, default: 8 },
  status: { 
    type: String, 
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  }
}, {
  timestamps: true
});

export default mongoose.model<IRoom>('Room', RoomSchema); 