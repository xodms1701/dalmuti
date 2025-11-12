import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const ResultModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ResultContent = styled.div<{ isRevolution: boolean }>`
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ResultIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
`;

const ResultTitle = styled.h2<{ isRevolution: boolean }>`
  font-size: 2rem;
  color: ${({ isRevolution }) => (isRevolution ? "#e74c3c" : "#28a745")};
  margin-bottom: 1rem;
  font-weight: bold;
`;

const ResultDescription = styled.p`
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const CountdownText = styled.div`
  font-size: 1rem;
  color: #999;
`;

const CountdownNumber = styled.span`
  font-size: 1.5rem;
  font-weight: bold;
  color: #4a90e2;
`;

const RevolutionSelection: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, selectRevolution } = useSocketContext();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [myChoice, setMyChoice] = useState<boolean | null>(null);

  const myPlayer = game?.players.find((player) => player.id === socketId);
  const isMyTurn = game?.currentTurn === socketId;

  // 게임 페이즈가 변경되면 결과 모달 표시
  useEffect(() => {
    if (myChoice !== null && game?.phase === "playing") {
      setShowResult(true);
      setCountdown(5);
    }
  }, [game?.phase, myChoice]);

  // 카운트다운 및 페이지 이동
  useEffect(() => {
    if (showResult) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // 혁명 거부 시 세금 교환이 있으면 tax 페이지로, 아니면 play 페이지로
            if (myChoice === false && game?.taxExchanges && game.taxExchanges.length > 0) {
              navigate("/tax");
            } else {
              navigate("/play");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showResult, myChoice, game?.taxExchanges, navigate]);

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
    setMyChoice(wantRevolution);
    try {
      await selectRevolution(game.roomId, socketId, wantRevolution);
    } catch (error) {
      console.error("혁명 선택 실패:", error);
      setIsSubmitting(false);
      setMyChoice(null);
    }
  };

  // 결과 메시지 생성
  const getResultContent = () => {
    if (myChoice === true) {
      const isGreatRevolution = game?.revolutionStatus?.isGreatRevolution;
      return {
        icon: "🔥",
        title: isGreatRevolution ? "대혁명 발생!" : "혁명 발생!",
        description: isGreatRevolution
          ? "모든 플레이어의 순위가 뒤집힙니다! 세금 없이 게임이 시작됩니다."
          : "순위는 유지되지만 세금 없이 게임이 시작됩니다!",
        isRevolution: true,
      };
    } else {
      return {
        icon: "😊",
        title: "무사히 지나갔습니다",
        description:
          "순위가 그대로 유지되고 정상적으로 세금을 거둡니다. 조커 2장을 가진 사실을 숨겼습니다!",
        isRevolution: false,
      };
    }
  };

  return (
    <Container>
      <Title>🃏 혁명 선택</Title>

      {showResult && (
        <ResultModal>
          <ResultContent isRevolution={getResultContent().isRevolution}>
            <ResultIcon>{getResultContent().icon}</ResultIcon>
            <ResultTitle isRevolution={getResultContent().isRevolution}>
              {getResultContent().title}
            </ResultTitle>
            <ResultDescription>
              {getResultContent().description}
            </ResultDescription>
            <CountdownText>
              <CountdownNumber>{countdown}</CountdownNumber>초 후 다음 페이지로
              이동합니다
            </CountdownText>
          </ResultContent>
        </ResultModal>
      )}

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
            순위가 그대로 유지되고 정상적으로 세금을 거둡니다. 조커 2장을 가진
            사실을 숨길 수 있습니다.
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
