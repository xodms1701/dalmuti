import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { socketManager } from '../utils/socket';
import { RootState } from '../store';
import { GamePhase } from '../types';

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const PlayerList = styled.div`
  margin-top: 20px;
`;

const PlayerItem = styled.div`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
`;

const Room: React.FC = () => {
  const navigate = useNavigate();
  const { roomCode } = useSelector((state: RootState) => state.room);
  const { players, phase } = useSelector((state: RootState) => state.game);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

  const handleReady = () => {
    if (roomCode) {
      socketManager.setReady(roomCode);
      setIsReady(true);
    }
  };

  const handleDrawRoleCard = () => {
    if (roomCode) {
      socketManager.drawRoleCard(roomCode);
    }
  };

  return (
    <Container>
      <h1>방 코드: {roomCode}</h1>
      
      {phase === GamePhase.ROLE_ASSIGNMENT && (
        <>
          <h2>역할 카드 뽑기</h2>
          {!isReady && (
            <Button onClick={handleReady}>준비</Button>
          )}
          {isReady && (
            <Button onClick={handleDrawRoleCard}>역할 카드 뽑기</Button>
          )}
        </>
      )}

      {phase === GamePhase.CARD_EXCHANGE && (
        <>
          <h2>카드 교환</h2>
          {/* 카드 교환 UI 구현 */}
        </>
      )}

      {phase === GamePhase.PLAYING && (
        <>
          <h2>게임 진행 중</h2>
          {/* 게임 진행 UI 구현 */}
        </>
      )}

      <PlayerList>
        <h3>플레이어 목록</h3>
        {players.map(player => (
          <PlayerItem key={player.id}>
            <div>닉네임: {player.nickname}</div>
            <div>역할: {player.role || '미정'}</div>
            <div>준비 상태: {player.isReady ? '준비완료' : '준비중'}</div>
          </PlayerItem>
        ))}
      </PlayerList>
    </Container>
  );
};

export default Room; 