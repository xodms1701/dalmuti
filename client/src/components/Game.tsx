import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GameState, Player, Card, GamePhase, Play } from '../types';
import { socketManager } from '../utils/socket';
import { GameBoard } from './game/GameBoard';

const Game: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setError('게임방 코드가 없습니다.');
      setIsLoading(false);
      return;
    }

    const handleGameState = (state: GameState) => {
      setGameState(state);
      const player = state.players.find(p => p.id === socketManager.getSocketId());
      if (player) {
        setCurrentPlayer(player);
      }
      setIsLoading(false);
    };

    const handleError = (error: Error) => {
      console.error('게임 에러:', error);
      setError('게임 연결 중 오류가 발생했습니다.');
      setIsLoading(false);
    };

    try {
      socketManager.connect();
      socketManager.joinGame(roomCode);
      socketManager.onGameState(handleGameState);
      socketManager.onError(handleError);
    } catch (err) {
      handleError(err as Error);
    }

    return () => {
      socketManager.offGameState(handleGameState);
      socketManager.offError(handleError);
      socketManager.disconnect();
    };
  }, [roomCode]);

  if (isLoading) {
    return <div className="loading">게임 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!gameState || !currentPlayer) {
    return <div className="error">게임 정보를 불러올 수 없습니다.</div>;
  }

  const handleReady = () => {
    try {
      socketManager.playerReady(roomCode!);
    } catch (err) {
      console.error('준비 완료 에러:', err);
      setError('준비 완료 처리 중 오류가 발생했습니다.');
    }
  };

  const handleExchange = (toPlayerId: string, cards: Card[]) => {
    try {
      socketManager.exchangeCards(roomCode!, toPlayerId, cards);
    } catch (err) {
      console.error('카드 교환 에러:', err);
      setError('카드 교환 중 오류가 발생했습니다.');
    }
  };

  const handlePlay = (cards: Card[]) => {
    try {
      socketManager.playCards(roomCode!, cards);
    } catch (err) {
      console.error('카드 내기 에러:', err);
      setError('카드 내기 중 오류가 발생했습니다.');
    }
  };

  const handlePass = () => {
    try {
      socketManager.pass(roomCode!);
    } catch (err) {
      console.error('패스 에러:', err);
      setError('패스 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="game-container">
      <div className="game-message">
        {gameState.uiState.message}
      </div>
      <GameBoard
        players={gameState.players}
        currentPlayer={currentPlayer}
        phase={gameState.phase}
        currentTurn={gameState.currentTurn}
        lastPlay={gameState.lastPlay}
        onReady={handleReady}
        onExchange={handleExchange}
        onPlay={handlePlay}
        onPass={handlePass}
      />
    </div>
  );
};

export default Game;