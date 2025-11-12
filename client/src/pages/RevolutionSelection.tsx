import React, { useState } from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
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

const InfoBox = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  width: 100%;
`;

const InfoText = styled.p`
  font-size: 1rem;
  color: #856404;
  margin: 0.5rem 0;
  line-height: 1.6;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  width: 100%;
`;

const ChoiceButton = styled.button`
  background: white;
  border: 3px solid #4a90e2;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(74, 144, 226, 0.3);
    border-color: #357abd;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonTitle = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
`;

const ButtonDescription = styled.div`
  font-size: 0.95rem;
  color: #666;
  line-height: 1.5;
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

const Highlight = styled.span`
  color: #e74c3c;
  font-weight: bold;
`;

const RevolutionSelection: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, selectRevolution } = useSocketContext();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myPlayer = game?.players.find((player) => player.id === socketId);
  const isMyTurn = game?.currentTurn === socketId;

  if (!myPlayer || !isMyTurn) {
    return (
      <Container>
        <Title>혁명 선택</Title>
        <InfoBox>
          <InfoText>다른 플레이어가 혁명을 선택하고 있습니다...</InfoText>
        </InfoBox>
      </Container>
    );
  }

  // 대혁명인지 일반 혁명인지 판단
  const playerCount = game?.players.length || 0;
  const isLowestRank = myPlayer.rank === playerCount;
  const revolutionType = isLowestRank ? "대혁명" : "일반 혁명";

  const handleSelect = async (wantRevolution: boolean) => {
    if (!game?.roomId || !socketId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await selectRevolution(game.roomId, socketId, wantRevolution);
    } catch (error) {
      console.error("혁명 선택 실패:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <Title>🃏 혁명 선택</Title>

      <InfoBox>
        <InfoText>
          <strong>축하합니다!</strong> 당신은 조커 2장을 받았습니다!
        </InfoText>
        <InfoText>
          현재 순위: <strong>{myPlayer.rank}등</strong>
        </InfoText>
        <InfoText>
          혁명을 일으키면 <Highlight>{revolutionType}</Highlight>이 됩니다
        </InfoText>
        {isLowestRank ? (
          <InfoText>
            • <strong>대혁명</strong>: 모든 플레이어의 순위가 뒤집힙니다 (1등↔최하위,
            2등↔두 번째 최하위...) + 세금 없음
          </InfoText>
        ) : (
          <InfoText>
            • <strong>일반 혁명</strong>: 순위는 유지되지만 세금이 없습니다
          </InfoText>
        )}
      </InfoBox>

      <ButtonContainer>
        <ChoiceButton
          onClick={() => handleSelect(true)}
          disabled={isSubmitting}
        >
          <ButtonTitle>🔥 혁명을 일으킨다</ButtonTitle>
          <ButtonDescription>
            {revolutionType}이 발생합니다
            {isLowestRank
              ? ". 모든 순위가 뒤집히고 세금이 없습니다."
              : ". 순위는 유지되고 세금이 없습니다."}
          </ButtonDescription>
        </ChoiceButton>

        <ChoiceButton
          onClick={() => handleSelect(false)}
          disabled={isSubmitting}
        >
          <ButtonTitle>😊 혁명을 일으키지 않는다</ButtonTitle>
          <ButtonDescription>
            조커 2장의 힘으로 1등이 됩니다. 나머지 플레이어의 순위가 재배정되며,
            정상적으로 세금을 거둡니다.
          </ButtonDescription>
        </ChoiceButton>
      </ButtonContainer>

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="play"
      />
    </Container>
  );
};

export default RevolutionSelection;
