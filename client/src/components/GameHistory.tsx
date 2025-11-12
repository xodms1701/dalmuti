import React from "react";
import styled from "styled-components";
import { GameHistory as GameHistoryType } from "../types";
import { useGameStore } from "../store/gameStore";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-right: 2rem;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HistoryCard = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    background: #e9ecef;
    border-color: #4a90e2;
  }
`;

const GameNumber = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 0.75rem;
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const GameDate = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const TotalRounds = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const PlayerRankings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Rank = styled.span<{ rank: number }>`
  font-weight: bold;
  font-size: 1rem;
  min-width: 40px;
  color: ${(props) => {
    if (props.rank === 1) return "#FFD700";
    if (props.rank === 2) return "#C0C0C0";
    if (props.rank === 3) return "#CD7F32";
    return "#666";
  }};
`;

const PlayerName = styled.span`
  font-size: 1rem;
  color: #333;
  flex: 1;
`;

const Stats = styled.span`
  font-size: 0.85rem;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

interface GameHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  histories: GameHistoryType[];
}

const GameHistory: React.FC<GameHistoryProps> = ({
  isOpen,
  onClose,
  histories,
}) => {
  const { setSelectedHistoryIndex } = useGameStore();

  if (!isOpen) return null;

  const handleHistoryClick = (index: number) => {
    setSelectedHistoryIndex(index);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getRankLabel = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}등`;
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>게임 이력</Title>
        {histories.length === 0 ? (
          <EmptyState>아직 게임 이력이 없습니다.</EmptyState>
        ) : (
          <HistoryList>
            {histories.map((history, index) => (
              <HistoryCard
                key={index}
                onClick={() => handleHistoryClick(index)}
              >
                <GameNumber>게임 {history.gameNumber}</GameNumber>
                <GameInfo>
                  <GameDate>
                    {formatDate(history.startedAt)} ~{" "}
                    {formatDate(history.endedAt)}
                  </GameDate>
                  <TotalRounds>총 {history.totalRounds} 라운드</TotalRounds>
                </GameInfo>
                <PlayerRankings>
                  {history.players.map((player, idx) => (
                    <RankRow key={idx}>
                      <Rank rank={player.rank}>{getRankLabel(player.rank)}</Rank>
                      <PlayerName>{player.nickname}</PlayerName>
                      <Stats>
                        {player.finishedAtRound}R | 플레이: {player.totalCardsPlayed}장 | 패스:{" "}
                        {player.totalPasses}회
                      </Stats>
                    </RankRow>
                  ))}
                </PlayerRankings>
              </HistoryCard>
            ))}
          </HistoryList>
        )}
      </Modal>
    </Overlay>
  );
};

export default GameHistory;
