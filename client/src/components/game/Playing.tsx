import React, { useState } from 'react';
import { Player, Card, Play } from '../../types';

interface PlayingProps {
  players: Player[];
  currentPlayer: Player;
  currentTurn: string | null;
  lastPlay: Play | null;
  onPlay: (cards: Card[]) => void;
  onPass: () => void;
}

export const Playing: React.FC<PlayingProps> = ({
  players,
  currentPlayer,
  currentTurn,
  lastPlay,
  onPlay,
  onPass
}) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  const handleCardSelect = (card: Card) => {
    if (currentTurn !== currentPlayer.id) return;
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter(c => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length > 0) {
      onPlay(selectedCards);
      setSelectedCards([]);
    }
  };

  const isCurrentTurn = currentTurn === currentPlayer.id;

  return (
    <div className="playing">
      <div className="players">
        {players.map(player => (
          <div
            key={player.id}
            className={`player ${player.id === currentTurn ? 'current-turn' : ''}`}
          >
            <span className="nickname">{player.nickname}</span>
            <span className="card-count">{player.cards.length}장</span>
          </div>
        ))}
      </div>
      <div className="last-play">
        {lastPlay && (
          <div>
            <span>{players.find(p => p.id === lastPlay.playerId)?.nickname}</span>
            <span>님이 {lastPlay.cards.length}장을 냈습니다.</span>
          </div>
        )}
      </div>
      <div className="player-cards">
        {currentPlayer.cards.map(card => (
          <div
            key={`${card.rank}-${card.suit}`}
            className={`card ${selectedCards.includes(card) ? 'selected' : ''}`}
            onClick={() => handleCardSelect(card)}
          >
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
        ))}
      </div>
      {isCurrentTurn && (
        <div className="actions">
          <button
            onClick={handlePlay}
            disabled={selectedCards.length === 0}
          >
            카드 내기
          </button>
          <button onClick={onPass}>
            패스
          </button>
        </div>
      )}
    </div>
  );
}; 