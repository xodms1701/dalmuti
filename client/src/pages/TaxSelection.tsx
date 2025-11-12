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
  const { socketId } = useSocketContext();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const myPlayer = game?.players.find((player) => player.id === socketId);

  // 5초 카운트다운 후 플레이 페이지로 이동
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/play");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  if (!myPlayer) {
    return (
      <Container>
        <Title>💰 세금 교환</Title>
        <WaitingMessage>
          <InfoText>로딩 중...</InfoText>
        </WaitingMessage>
      </Container>
    );
  }

  // 내가 준 세금과 받은 세금 찾기
  const myGivenTax = game?.taxExchanges?.find(
    (ex) => ex.fromPlayerId === socketId
  );
  const myReceivedTax = game?.taxExchanges?.find(
    (ex) => ex.toPlayerId === socketId
  );

  // 세금 교환 대상자인지 확인
  const isInvolved = myGivenTax || myReceivedTax;

  return (
    <Container>
      <Title>💰 세금 교환</Title>

      <InfoBox>
        <InfoText>
          <strong>현재 순위:</strong> {myPlayer.rank}등
        </InfoText>
        <InfoText>
          세금 교환이 자동으로 완료되었습니다!
        </InfoText>
      </InfoBox>

      {isInvolved ? (
        <>
          {myGivenTax && (
            <InfoBox style={{ background: "#fff3cd", borderColor: "#ffc107" }}>
              <InfoText>
                <strong>
                  {game.players.find((p) => p.id === myGivenTax.toPlayerId)?.nickname}
                  님에게 보낸 카드:
                </strong>
              </InfoText>
              <CardList>
                {myGivenTax.cardsGiven.map((card, idx) => (
                  <Card key={idx} selected={false} disabled={true}>
                    {card.isJoker ? "🃏" : card.rank}
                  </Card>
                ))}
              </CardList>
            </InfoBox>
          )}

          {myReceivedTax && myReceivedTax.cardsReceived.length > 0 && (
            <InfoBox style={{ background: "#d4edda", borderColor: "#28a745" }}>
              <InfoText>
                <strong>
                  {game.players.find((p) => p.id === myReceivedTax.fromPlayerId)?.nickname}
                  님에게서 받은 카드:
                </strong>
              </InfoText>
              <CardList>
                {myReceivedTax.cardsReceived.map((card, idx) => (
                  <Card key={idx} selected={false} disabled={true}>
                    {card.isJoker ? "🃏" : card.rank}
                  </Card>
                ))}
              </CardList>
            </InfoBox>
          )}
        </>
      ) : (
        <InfoBox>
          <InfoText>
            세금 교환 대상이 아닙니다. 게임을 시작합니다!
          </InfoText>
        </InfoBox>
      )}

      <InfoBox>
        <InfoText>
          <strong>내 현재 카드:</strong>
        </InfoText>
        <CardList>
          {myPlayer.cards
            .slice()
            .sort((a, b) => a.rank - b.rank)
            .map((card, idx) => (
              <Card key={idx} selected={false} disabled={true}>
                {card.isJoker ? "🃏" : card.rank}
              </Card>
            ))}
        </CardList>
      </InfoBox>

      <WaitingMessage>
        <InfoText>
          <strong>{countdown}</strong>초 후 게임이 시작됩니다...
        </InfoText>
      </WaitingMessage>

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
