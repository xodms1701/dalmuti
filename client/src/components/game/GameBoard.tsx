import React, { useState } from 'react';
import { Player, Card, GamePhase, Play } from '../../types';
import { WaitingRoom } from './WaitingRoom';
import { RoleAssignment } from './RoleAssignment';
import { CardExchange } from './CardExchange';
import { Playing } from './Playing';

interface GameBoardProps {
  players: Player[];
  currentPlayer: Player;
  phase: GamePhase;
  currentTurn: string | null;
  lastPlay: Play | null;
  onReady: () => void;
  onExchange: (toPlayerId: string, cards: Card[]) => void;
  onPlay: (cards: Card[]) => void;
  onPass: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayer,
  phase,
  currentTurn,
  lastPlay,
  onReady,
  onExchange,
  onPlay,
  onPass
}) => {
  const renderPhase = () => {
    switch (phase) {
      case GamePhase.WAITING:
        return <WaitingRoom players={players} currentPlayer={currentPlayer} onReady={onReady} />;
      case GamePhase.ROLE_ASSIGNMENT:
        return <RoleAssignment players={players} currentPlayer={currentPlayer} />;
      case GamePhase.CARD_EXCHANGE:
        return (
          <CardExchange
            players={players}
            currentPlayer={currentPlayer}
            exchangeablePlayers={players
              .filter(p => p.role && p.role < currentPlayer.role!)
              .map(p => p.id)}
            onExchange={onExchange}
          />
        );
      case GamePhase.PLAYING:
        return (
          <Playing
            players={players}
            currentPlayer={currentPlayer}
            currentTurn={currentTurn}
            lastPlay={lastPlay}
            onPlay={onPlay}
            onPass={onPass}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="game-board">
      {renderPhase()}
    </div>
  );
}; 