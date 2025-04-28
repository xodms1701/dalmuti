import React, { useState, useEffect } from "react";
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

const CardList = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 2rem 0;
`;

const Card = styled.div<{ selected: boolean }>`
  width: 60px;
  height: 90px;
  border-radius: 8px;
  border: 2px solid ${({ selected }) => (selected ? "#4a90e2" : "#ccc")};
  background: ${({ selected }) => (selected ? "#e3f0fc" : "#fff")};
  color: #333;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: background 0.2s, border 0.2s;
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const TurnInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const TurnOrder = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const PlayerName = styled.span<{ isCurrent: boolean }>`
  color: ${({ isCurrent }) => (isCurrent ? "#4a90e2" : "#666")};
  font-weight: ${({ isCurrent }) => (isCurrent ? "bold" : "normal")};
`;

const ResultInfo = styled.div`
  margin-top: 2rem;
  padding: 1rem 2rem;
  background-color: #e9ecef;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RankRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const RankItem = styled.div<{ isMe: boolean }>`
  font-weight: ${({ isMe }) => (isMe ? "bold" : "normal")};
  color: ${({ isMe }) => (isMe ? "#4a90e2" : "#333")};
  background: ${({ isMe }) => (isMe ? "#e3f0fc" : "transparent")};
  border-radius: 6px;
  padding: 0.2rem 0.7rem;
`;

const Button = styled.button<{ disabled?: boolean }>`
  padding: 0.75rem 1.5rem;
  background-color: ${({ disabled }) => (disabled ? "#ccc" : "#4a90e2")};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background-color 0.2s;
  margin: 0 0.5rem;
`;

const PlayPage: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, playCard, pass } = useSocketContext();
  const [selectedIdxs, setSelectedIdxs] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (game?.isVoting) {
      navigate("/vote");
    }
  }, [game?.isVoting, navigate]);

  if (!game) return <Container>로딩 중...</Container>;

  const me = game.players.find((p) => p.id === socketId);

  const toggleCard = (idx: number) => {
    setSelectedIdxs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handlePlayCard = async () => {
    if (!me || selectedIdxs.length === 0 || !game?.roomId || !socketId) return;
    const cardsToPlay = selectedIdxs.map((idx) => me.cards[idx]);
    await playCard(game.roomId, socketId, cardsToPlay);
    setSelectedIdxs([]);
  };

  const handlePass = async () => {
    if (!game?.roomId || !socketId) return;
    await pass(game.roomId, socketId);
    setSelectedIdxs([]);
  };

  // 순위 순서대로 정렬된 플레이어 목록
  const sortedPlayers = [...game.players].sort(
    (a, b) => (a.rank || 0) - (b.rank || 0)
  );

  return (
    <Container>
      <Title>플레이 화면</Title>

      <TurnInfo>
        <Info>
          <b>플레이 순서:</b>
        </Info>
        <TurnOrder>
          {sortedPlayers.map((player) => (
            <PlayerName
              key={player.id}
              isCurrent={player.id === game.currentTurn}
            >
              {player.nickname}
              {player.id === socketId ? " (나)" : ""}
              {player.id !== sortedPlayers[sortedPlayers.length - 1].id &&
                " → "}
            </PlayerName>
          ))}
        </TurnOrder>
      </TurnInfo>

      <Info>
        <b>마지막 플레이:</b>{" "}
        {game.lastPlay?.cards
          ? `${
              game.players.find((p) => p.id === game.lastPlay?.playerId)
                ?.nickname
            } - ${game.lastPlay.cards
              .map((c) => (c.isJoker ? "Joker" : c.rank))
              .join(", ")}`
          : "아직 아무도 내지 않음"}
      </Info>

      <Info>
        <b>내 카드:</b>
      </Info>
      <CardList>
        {me?.cards.map((card, idx) => (
          <Card
            key={idx}
            selected={selectedIdxs.includes(idx)}
            onClick={() => toggleCard(idx)}
          >
            {card.isJoker ? "Joker" : card.rank}
          </Card>
        ))}
      </CardList>

      {/* 카드 버튼 영역을 순위 박스보다 위에 배치 */}
      {socketId &&
        game.currentTurn === socketId &&
        !game.finishedPlayers.includes(socketId) && (
          <div>
            <Button
              onClick={handlePlayCard}
              disabled={selectedIdxs.length === 0}
            >
              카드 내기
            </Button>
            <Button
              onClick={() => setSelectedIdxs([])}
              disabled={selectedIdxs.length === 0}
            >
              선택 취소
            </Button>
            <Button onClick={handlePass}>패스</Button>
          </div>
        )}

      {/* 순위 박스는 항상 하단에 위치 */}
      <ResultInfo>
        {game.finishedPlayers.length > 0 && (
          <>
            <Info>
              <b>현재 순위:</b>
            </Info>
            <RankRow>
              {game.finishedPlayers.map((playerId, index) => {
                const player = game.players.find((p) => p.id === playerId);
                const isMe = me ? playerId === me.id : false;
                return (
                  <RankItem key={playerId} isMe={isMe}>
                    {index + 1}등: {player?.nickname}
                  </RankItem>
                );
              })}
            </RankRow>
          </>
        )}
        {me && game.finishedPlayers.includes(me.id) && (
          <Info>
            <b>
              내 순위:{" "}
              {game.finishedPlayers.findIndex((id) => id === me.id) + 1}등
            </b>
          </Info>
        )}
        {/* 게임이 끝나지 않은 사람은 "게임 종료 대기 중..." 메시지 */}
        {me && !game.finishedPlayers.includes(me.id) && (
          <Info>게임 종료 대기 중...</Info>
        )}
      </ResultInfo>
    </Container>
  );
};

export default PlayPage;
