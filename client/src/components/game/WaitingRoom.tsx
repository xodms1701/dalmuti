import React from 'react';
import { Player } from '../../types';

interface WaitingRoomProps {
  players: Player[];
  currentPlayer: Player;
  onReady: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ players, currentPlayer, onReady }) => {
  return (
    <div className="waiting-room">
      <h2>대기실</h2>
      <div className="players-list">
        {players.map(player => (
          <div key={player.id} className={`player ${player.id === currentPlayer.id ? 'current' : ''}`}>
            <span className="nickname">{player.nickname}</span>
            {player.isReady && <span className="ready-badge">준비 완료</span>}
          </div>
        ))}
      </div>
      {!currentPlayer.isReady && (
        <button className="ready-button" onClick={onReady}>
          준비하기
        </button>
      )}
    </div>
  );
}; 