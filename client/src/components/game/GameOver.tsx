import React from 'react';
import { Player } from '../../types';

interface GameOverProps {
  players: Player[];
}

export const GameOver: React.FC<GameOverProps> = ({ players }) => {
  const sortedPlayers = [...players].sort((a, b) => a.cards.length - b.cards.length);

  return (
    <div className="game-over">
      <h2>게임 종료</h2>
      <div className="results">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className={`result ${index === 0 ? 'winner' : ''}`}>
            <span className="rank">{index + 1}위</span>
            <span className="nickname">{player.nickname}</span>
            <span className="card-count">{player.cards.length}장</span>
          </div>
        ))}
      </div>
    </div>
  );
}; 