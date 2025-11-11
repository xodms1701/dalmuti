import React from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import { RoleSelectionCard } from "../types";
import { useNavigate } from "react-router-dom";
import RoleCard from "../components/RoleCard";
import styled from "styled-components";
import HelpModal from "../components/HelpModal";

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

const HelpButton = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #4a90e2;
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #357abd;
    transform: scale(1.05);
  }
`;

const GuideBox = styled.div`
  background: #e3f0fc;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  text-align: center;
`;

const GuideText = styled.p`
  font-size: 1rem;
  color: #333;
  margin: 0.5rem 0;
  line-height: 1.6;
`;

const Highlight = styled.span`
  color: #4a90e2;
  font-weight: bold;
`;

const RoleSelection: React.FC = () => {
  const { socketId, selectRole } = useSocketContext();
  const { game } = useGameStore();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const handleSelect = async (roleNumber: number) => {
    if (!game?.roomId || !socketId) return;
    await selectRole(game.roomId, socketId, roleNumber);
  };

  React.useEffect(() => {
    if (game?.phase === "cardSelection") {
      navigate("/select-card-deck");
    }
  }, [game?.phase, navigate]);

  const myPlayer = game?.players.find((p) => p.id === socketId);
  const hasSelectedRole = myPlayer?.role !== null;

  return (
    <Container>
      <Title>역할 선택</Title>

      <GuideBox>
        <GuideText>
          <Highlight>낮은 숫자</Highlight>를 선택할수록 높은 순위를 가집니다!
        </GuideText>
        <GuideText>
          이 순위는 카드 덱 선택 순서와 게임 진행 순서를 결정합니다.
        </GuideText>
        {hasSelectedRole && (
          <GuideText style={{ color: "#28a745", fontWeight: "bold" }}>
            ✓ 선택 완료! 다른 플레이어를 기다리는 중...
          </GuideText>
        )}
      </GuideBox>

      <Info>아래 카드 중 하나를 클릭해 역할을 선택하세요</Info>
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

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="roleSelection"
      />
    </Container>
  );
};

export default RoleSelection;
