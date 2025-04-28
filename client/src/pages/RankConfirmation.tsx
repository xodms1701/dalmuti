import React from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 2rem;
`;

const Title = styled.h2`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`;

const RankList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 600px;
  margin-bottom: 2rem;
`;

const PlayerItem = styled.div<{ rank: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid
    ${({ rank }) => {
      switch (rank) {
        case 1:
          return "#FFD700";
        case 2:
          return "#C0C0C0";
        case 3:
          return "#CD7F32";
        default:
          return "#E0E0E0";
      }
    }};
`;

const PlayerName = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
`;

const RankBadge = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  color: #666;
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const ShuffleButton = styled.button`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }
`;

const RankConfirmation: React.FC = () => {
  const { socketId, dealCards } = useSocketContext();
  const { game } = useGameStore();
  const navigate = useNavigate();

  const handleShuffle = async () => {
    if (!game?.roomId || !socketId) return;
    await dealCards(game.roomId);
  };

  React.useEffect(() => {
    if (game?.phase === "cardSelection") {
      navigate("/select-card-deck");
    }
  }, [game?.phase, navigate]);

  if (!game) return null;

  // 플레이어들을 rank 순서대로 정렬
  const sortedPlayers = [...game.players].sort(
    (a, b) => (a.rank || 0) - (b.rank || 0)
  );

  return (
    <Container>
      <Title>계급 확인</Title>
      <Info>이전 게임의 순위에 따라 계급이 재배정되었습니다.</Info>
      <RankList>
        {sortedPlayers.map((player) => (
          <PlayerItem key={player.id} rank={player.rank || 0}>
            <PlayerName>{player.nickname}</PlayerName>
            <RankBadge>{player.rank}등</RankBadge>
          </PlayerItem>
        ))}
      </RankList>
      {game.ownerId === socketId && (
        <ShuffleButton onClick={handleShuffle}>카드 섞기</ShuffleButton>
      )}
    </Container>
  );
};

export default RankConfirmation;
