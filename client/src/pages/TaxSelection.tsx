import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import styled from "styled-components";
import { Card as CardType } from "../types";
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
  background: #e3f0fc;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  width: 100%;
`;

const InfoText = styled.p`
  font-size: 1rem;
  color: #333;
  margin: 0.5rem 0;
  line-height: 1.6;
`;

const Highlight = styled.span`
  color: #e74c3c;
  font-weight: bold;
`;

const CardList = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 2rem 0;
  max-width: 800px;
`;

const Card = styled.div<{ selected: boolean; disabled?: boolean }>`
  width: 60px;
  height: 90px;
  border-radius: 8px;
  border: 2px solid
    ${({ selected, disabled }) =>
      disabled ? "#e0e0e0" : selected ? "#4a90e2" : "#ccc"};
  background: ${({ selected, disabled }) =>
    disabled ? "#f5f5f5" : selected ? "#e3f0fc" : "#fff"};
  color: ${({ disabled }) => (disabled ? "#aaa" : "#333")};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:hover {
    ${({ disabled, selected }) =>
      !disabled &&
      `
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      border-color: ${selected ? "#357abd" : "#999"};
    `}
  }
`;

const Button = styled.button<{ disabled?: boolean }>`
  padding: 0.75rem 2rem;
  background-color: ${({ disabled }) => (disabled ? "#ccc" : "#4a90e2")};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    background-color: #357abd;
    transform: translateY(-2px);
  }
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

const WaitingMessage = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  width: 100%;
  text-align: center;
`;

const TaxStatusList = styled.div`
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
  max-width: 600px;
  width: 100%;
`;

const TaxStatusItem = styled.div<{ completed: boolean }>`
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: ${({ completed }) => (completed ? "#d4edda" : "#fff3cd")};
  border-radius: 4px;
  font-size: 0.9rem;
  color: #333;
`;

const TaxSelection: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, selectTaxCards } = useSocketContext();
  const navigate = useNavigate();
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myPlayer = game?.players.find((player) => player.id === socketId);

  // 게임 페이즈가 playing으로 변경되면 플레이 페이지로 이동
  useEffect(() => {
    if (game?.phase === "playing") {
      navigate("/play");
    }
  }, [game?.phase, navigate]);

  if (!myPlayer) {
    return (
      <Container>
        <Title>세금 납부</Title>
        <WaitingMessage>
          <InfoText>로딩 중...</InfoText>
        </WaitingMessage>
      </Container>
    );
  }

  // 내가 세금을 내야 하는지 확인
  const myTaxExchange = game?.taxExchanges?.find(
    (ex) => ex.fromPlayerId === socketId && !ex.completed
  );

  const toggleCard = (card: CardType) => {
    // 조커는 선택 불가
    if (card.isJoker) {
      alert("조커는 세금으로 낼 수 없습니다!");
      return;
    }

    const isAlreadySelected = selectedCards.some(
      (c) => c.rank === card.rank && c.isJoker === card.isJoker
    );

    if (isAlreadySelected) {
      setSelectedCards(
        selectedCards.filter(
          (c) => !(c.rank === card.rank && c.isJoker === card.isJoker)
        )
      );
    } else {
      if (myTaxExchange && selectedCards.length < myTaxExchange.cardCount) {
        setSelectedCards([...selectedCards, card]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!game?.roomId || !socketId || !myTaxExchange || isSubmitting) return;

    if (selectedCards.length !== myTaxExchange.cardCount) {
      alert(
        `정확히 ${myTaxExchange.cardCount}장의 카드를 선택해야 합니다.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await selectTaxCards(game.roomId, socketId, selectedCards);
      setSelectedCards([]);
    } catch (error) {
      console.error("세금 카드 선택 실패:", error);
      setIsSubmitting(false);
      alert("세금 카드 선택에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 순위에 따른 안내 메시지
  const getGuidanceMessage = () => {
    if (!myPlayer.rank) return "";

    const playerCount = game?.players.length || 0;
    const isHighRank = myPlayer.rank <= 2;

    if (isHighRank) {
      return "가장 큰 숫자의 카드를 선택하세요 (높은 순위는 큰 카드를 냅니다)";
    } else {
      return "가장 작은 숫자의 카드를 선택하세요 (낮은 순위는 작은 카드를 냅니다)";
    }
  };

  // 세금 진행 상황 표시
  const renderTaxStatus = () => {
    if (!game?.taxExchanges) return null;

    return (
      <TaxStatusList>
        <InfoText>
          <strong>세금 교환 진행 상황:</strong>
        </InfoText>
        {game.taxExchanges.map((ex, idx) => {
          const fromPlayer = game.players.find((p) => p.id === ex.fromPlayerId);
          const toPlayer = game.players.find((p) => p.id === ex.toPlayerId);
          return (
            <TaxStatusItem key={idx} completed={ex.completed}>
              {fromPlayer?.nickname} → {toPlayer?.nickname}: {ex.cardCount}장{" "}
              {ex.completed ? "✓" : "대기 중..."}
            </TaxStatusItem>
          );
        })}
      </TaxStatusList>
    );
  };

  if (!myTaxExchange) {
    return (
      <Container>
        <Title>💰 세금 납부</Title>
        <WaitingMessage>
          <InfoText>다른 플레이어가 세금을 내고 있습니다...</InfoText>
        </WaitingMessage>
        {renderTaxStatus()}
        <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          type="play"
        />
      </Container>
    );
  }

  // 교환 대상 플레이어 찾기
  const targetPlayer = game?.players.find(
    (p) => p.id === myTaxExchange.toPlayerId
  );

  return (
    <Container>
      <Title>💰 세금 납부</Title>

      <InfoBox>
        <InfoText>
          <strong>현재 순위:</strong> {myPlayer.rank}등
        </InfoText>
        <InfoText>
          <strong>교환 대상:</strong> {targetPlayer?.nickname} (
          {targetPlayer?.rank}등)
        </InfoText>
        <InfoText>
          <strong>제출할 카드 수:</strong>{" "}
          <Highlight>{myTaxExchange.cardCount}장</Highlight>
        </InfoText>
        <InfoText>
          <strong>안내:</strong> {getGuidanceMessage()}
        </InfoText>
        <InfoText>
          • 조커는 세금으로 낼 수 없습니다
        </InfoText>
      </InfoBox>

      <InfoText>
        내 카드 ({selectedCards.length}/{myTaxExchange.cardCount} 선택됨)
      </InfoText>

      <CardList>
        {myPlayer.cards
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((card, idx) => {
            const isSelected = selectedCards.some(
              (c) => c.rank === card.rank && c.isJoker === card.isJoker
            );
            return (
              <Card
                key={`${card.rank}-${card.isJoker}-${idx}`}
                selected={isSelected}
                disabled={card.isJoker}
                onClick={() => toggleCard(card)}
              >
                {card.isJoker ? "🃏" : card.rank}
              </Card>
            );
          })}
      </CardList>

      <Button
        onClick={handleSubmit}
        disabled={
          selectedCards.length !== myTaxExchange.cardCount || isSubmitting
        }
      >
        {isSubmitting ? "제출 중..." : `${myTaxExchange.cardCount}장 제출하기`}
      </Button>

      {renderTaxStatus()}

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="play"
      />
    </Container>
  );
};

export default TaxSelection;
