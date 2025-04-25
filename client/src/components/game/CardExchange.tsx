import React, { useState } from 'react';
import { Player, Card } from '../../types';

interface CardExchangeProps {
  players: Player[];
  currentPlayer: Player;
  exchangeablePlayers: string[];
  onExchange: (toPlayerId: string, cards: Card[]) => void;
}

export const CardExchange: React.FC<CardExchangeProps> = ({
  players,
  currentPlayer,
  exchangeablePlayers,
  onExchange
}) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const handleCardSelect = (card: Card) => {
    if (selectedCards.length < 2 && !selectedCards.includes(card)) {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleCardDeselect = (card: Card) => {
    setSelectedCards(selectedCards.filter(c => c !== card));
  };

  const handleExchange = () => {
    if (selectedCards.length === 2 && selectedPlayerId) {
      onExchange(selectedPlayerId, selectedCards);
    }
  };

  return (
    <div className="card-exchange">
      <h2>카드 교환</h2>
      <div className="exchange-info">
        <p>높은 역할의 플레이어와 카드를 교환하세요.</p>
        <p>교환할 카드 2장을 선택해주세요.</p>
      </div>
      <div className="player-cards">
        {currentPlayer.cards.map(card => (
          <div
            key={`${card.rank}-${card.suit}`}
            className={`card ${selectedCards.includes(card) ? 'selected' : ''}`}
            onClick={() => selectedCards.includes(card) ? handleCardDeselect(card) : handleCardSelect(card)}
          >
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
        ))}
      </div>
      <div className="exchangeable-players">
        {exchangeablePlayers.map(playerId => {
          const player = players.find(p => p.id === playerId);
          if (!player) return null;
          return (
            <div
              key={playerId}
              className={`player ${selectedPlayerId === playerId ? 'selected' : ''}`}
              onClick={() => setSelectedPlayerId(playerId)}
            >
              {player.nickname}
            </div>
          );
        })}
      </div>
      {selectedCards.length === 2 && selectedPlayerId && (
        <button className="exchange-button" onClick={handleExchange}>
          교환하기
        </button>
      )}
    </div>
  );
}; 