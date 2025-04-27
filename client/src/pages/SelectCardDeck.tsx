import React, { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

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

const DeckCard = styled.button<{ selected: boolean }>`
  width: 80px;
  height: 120px;
  border-radius: 10px;
  border: 2px solid ${({ selected }) => (selected ? "#ccc" : "#4a90e2")};
  background: ${({ selected }) => (selected ? "#eee" : "#fff")};
  color: #333;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ selected }) => (selected ? "not-allowed" : "pointer")};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: background 0.2s, border 0.2s;
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const SelectCardDeck: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, selectDeck } = useSocketContext();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleSelectDeck = (idx: number) => {
    if (!game?.roomId || !socketId) return;
    selectDeck(game.roomId, idx);
  };

  const myRank = game?.players.find((player) => player.id === socketId)?.rank;

  // rank 순서대로 플레이어 정렬
  const sortedPlayers = (game?.players || [])
    .slice()
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

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
      <Info>나의 계급: {myRank}</Info>
      <Info>
        플레이 순서:{" "}
        {sortedPlayers
          .map(
            (player, idx) =>
              `${player.nickname}${player.id === socketId ? " (나)" : ""}${
                idx < sortedPlayers.length - 1 ? " → " : ""
              }`
          )
          .join("")}
      </Info>
      {game?.players.every((player) => player.cards.length > 0) && (
        <Info>
          모든 플레이어가 카드를 받았습니다.
          <br />
          계급이 그대로라면 조커를 2장 뽑은 유저는 없습니다. <br />
          만약 계급이 변경되었다면 플레이 순서의 첫번째 유저가 조커를 2장 뽑은
          사람입니다.
        </Info>
      )}
      {countdown !== null && (
        <Info style={{ color: "#e74c3c", fontWeight: 600 }}>
          {countdown}초 뒤에 플레이 화면으로 이동합니다.
        </Info>
      )}
      <DeckList>
        {game?.selectableDecks.map((deck, idx) => (
          <DeckCard
            key={idx}
            selected={deck.isSelected}
            disabled={deck.isSelected}
            onClick={() => handleSelectDeck(idx)}
          >
            {idx + 1}
          </DeckCard>
        ))}
      </DeckList>
    </Container>
  );
};

export default SelectCardDeck;
