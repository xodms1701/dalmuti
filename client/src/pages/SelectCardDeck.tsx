import React, { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
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

const DeckList = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const DeckCard = styled.button<{ selected: boolean; disabled: boolean }>`
  width: 100px;
  height: 140px;
  border-radius: 12px;
  border: 3px solid ${({ selected }) => (selected ? "#ccc" : "#4a90e2")};
  background: ${({ selected }) => (selected ? "#f0f0f0" : "#fff")};
  color: ${({ selected }) => (selected ? "#999" : "#333")};
  font-size: 2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ selected }) => (selected ? "not-allowed" : "pointer")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  position: relative;

  &:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(74, 144, 226, 0.3);
    border-color: #357abd;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const SelectedBadge = styled.div`
  position: absolute;
  top: -10px;
  right: -10px;
  background: #28a745;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
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
  max-width: 800px;
  width: 100%;
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

const CurrentTurnBanner = styled.div<{ isMyTurn: boolean; isCountdown?: boolean }>`
  background: ${({ isMyTurn, isCountdown }) =>
    isCountdown ? "#e74c3c" : isMyTurn ? "#28a745" : "#ffc107"};
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  max-width: 800px;
  width: 100%;
`;

const TurnOrder = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1rem;
`;

const PlayerName = styled.span<{ isCurrent: boolean; hasSelected: boolean }>`
  color: ${({ isCurrent, hasSelected }) =>
    isCurrent ? "#28a745" : hasSelected ? "#999" : "#333"};
  font-weight: ${({ isCurrent }) => (isCurrent ? "bold" : "normal")};
  text-decoration: ${({ hasSelected }) => (hasSelected ? "line-through" : "none")};
`;

const RankBadge = styled.div<{ rank: number }>`
  background: ${({ rank }) => {
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
  color: #333;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  display: inline-block;
  margin-bottom: 1rem;
`;

const JokerInfo = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  max-width: 800px;
  width: 100%;
`;

const JokerText = styled.p`
  font-size: 0.95rem;
  color: #856404;
  margin: 0.25rem 0;
  line-height: 1.5;
`;

const SelectCardDeck: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, selectDeck } = useSocketContext();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleSelectDeck = (idx: number) => {
    if (!game?.roomId || !socketId) return;
    selectDeck(game.roomId, idx);
  };

  const myPlayer = game?.players.find((player) => player.id === socketId);
  const myRank = myPlayer?.rank;
  const isMyTurn = game?.currentTurn === socketId;

  // rank 순서대로 플레이어 정렬
  const sortedPlayers = (game?.players || [])
    .slice()
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const currentTurnPlayer = game?.players.find((p) => p.id === game.currentTurn);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (game?.phase === "playing") {
      setCountdown(10);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/play");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (game?.phase === "revolution") {
      navigate("/revolution");
    } else if (game?.phase === "tax") {
      navigate("/tax");
    } else {
      setCountdown(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [game?.phase, navigate]);

  return (
    <Container>
      <Title>카드 덱 선택</Title>

      <RankBadge rank={myRank || 0}>{myRank}등</RankBadge>

      <CurrentTurnBanner isMyTurn={isMyTurn} isCountdown={countdown !== null}>
        {countdown !== null ? (
          `⏰ ${countdown}초 후 게임이 시작됩니다...`
        ) : isMyTurn ? (
          "🎯 당신의 차례입니다! 카드 덱을 선택하세요"
        ) : (
          `${currentTurnPlayer?.nickname}님이 선택 중입니다...`
        )}
      </CurrentTurnBanner>

      <GuideBox>
        <GuideText>
          <Highlight>순위 순서대로</Highlight> 카드 덱을 선택합니다
        </GuideText>
        <GuideText>
          • 각 덱은 같은 수의 카드를 포함하고 있습니다
        </GuideText>
        <GuideText>
          • 조커 2장을 받으면 혁명 선택 페이즈로 이동합니다
        </GuideText>
      </GuideBox>

      <TurnOrder>
        <strong>선택 순서:</strong>
        {sortedPlayers.map((player, idx) => {
          const hasSelected = player.cards.length > 0;
          const isCurrent = player.id === game?.currentTurn;
          return (
            <React.Fragment key={player.id}>
              <PlayerName isCurrent={isCurrent} hasSelected={hasSelected}>
                {player.nickname}
                {player.id === socketId && " (나)"}
                {hasSelected && " ✓"}
              </PlayerName>
              {idx < sortedPlayers.length - 1 && " → "}
            </React.Fragment>
          );
        })}
      </TurnOrder>

      <DeckList>
        {game?.selectableDecks.map((deck, idx) => (
          <DeckCard
            key={idx}
            selected={deck.isSelected}
            disabled={deck.isSelected || !isMyTurn}
            onClick={() => handleSelectDeck(idx)}
          >
            {idx + 1}
            {deck.isSelected && <SelectedBadge>✓</SelectedBadge>}
          </DeckCard>
        ))}
      </DeckList>

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="play"
      />
    </Container>
  );
};

export default SelectCardDeck;
