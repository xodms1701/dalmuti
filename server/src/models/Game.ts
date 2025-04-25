import mongoose, { Schema, Document } from 'mongoose';

interface ICard {
  rank: number;
  count: number;
}

interface IPlayerState {
  userId: string;
  cards: ICard[];
  rank: number | null;
}

export interface IGame extends Document {
  roomId: string;
  players: IPlayerState[];
  currentTurn: string;
  lastPlay: {
    userId: string;
    cards: ICard[];
  } | null;
  status: 'active' | 'finished';
  revolution: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema: Schema = new Schema({
  roomId: { type: String, required: true },
  players: [{
    userId: { type: String, required: true },
    cards: [{
      rank: { type: Number, required: true },
      count: { type: Number, required: true }
    }],
    rank: { type: Number, default: null }
  }],
  currentTurn: { type: String, required: true },
  lastPlay: {
    userId: { type: String },
    cards: [{
      rank: { type: Number },
      count: { type: Number }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'finished'],
    default: 'active'
  },
  revolution: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model<IGame>('Game', GameSchema); 