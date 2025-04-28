import React from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import { RoleSelectionCard } from "../types";
import { useNavigate } from "react-router-dom";
import RoleCard from "../components/RoleCard";
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

const CardList = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
`;

const RoleSelection: React.FC = () => {
  const { socketId, selectRole, dealCards } = useSocketContext();
  const { game } = useGameStore();
  const navigate = useNavigate();

  const handleSelect = async (roleNumber: number) => {
    if (!game?.roomId || !socketId) return;
    await selectRole(game.roomId, socketId, roleNumber);
  };

  const handleShuffle = async () => {
    if (!game?.roomId || !socketId) return;
    await dealCards(game.roomId);
  };

  React.useEffect(() => {
    if (game?.phase === "cardSelection") {
      navigate("/select-card-deck");
    }
  }, [game?.phase, navigate]);

  return (
    <Container>
      <Title>역할을 선택하세요</Title>
      <Info>아래 카드 중 하나를 클릭해 역할을 선택하세요.</Info>
      <CardList>
        {(game?.roleSelectionDeck || []).map((role: RoleSelectionCard) => (
          <RoleCard
            key={role.number}
            number={role.number}
            flipped={role.isSelected}
            disabled={role.isSelected}
            onClick={() => handleSelect(role.number)}
          />
        ))}
      </CardList>
      {game?.ownerId === socketId &&
        game?.phase === "roleSelectionComplete" && (
          <button onClick={handleShuffle}>카드 섞기</button>
        )}
    </Container>
  );
};

export default RoleSelection;
