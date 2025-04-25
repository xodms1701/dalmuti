import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  nickname: string;
  socketId: string;
  currentRoom?: string;
  isReady: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  nickname: { type: String, required: true },
  socketId: { type: String, required: true },
  currentRoom: { type: String, default: null },
  isReady: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema); 