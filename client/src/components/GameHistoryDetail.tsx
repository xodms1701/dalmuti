import React from "react";
import styled from "styled-components";
import { GameHistory, RoundPlay } from "../types";

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
  z-index: 1001;
  padding: 1rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 900px;
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
  margin-bottom: 0.5rem;
  padding-right: 2rem;
`;

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  color: #4a90e2;
  margin-bottom: 1rem;
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const PlayerCard = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
`;

const PlayerRank = styled.div<{ rank: number }>`
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: ${(props) => {
    if (props.rank === 1) return "#FFD700";
    if (props.rank === 2) return "#C0C0C0";
    if (props.rank === 3) return "#CD7F32";
    return "#666";
  }};
`;

const PlayerName = styled.div`
  font-size: 1rem;
  color: #333;
  margin-bottom: 0.5rem;
`;

const PlayerStat = styled.div`
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
`;

const Timeline = styled.div`
  position: relative;
  padding-left: 2rem;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e9ecef;
  }
`;

const RoundGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const RoundHeader = styled.div`
  font-size: 1rem;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 0.75rem;
  margin-left: -2rem;
  padding-left: 2rem;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4a90e2;
    border: 3px solid white;
    box-shadow: 0 0 0 2px #4a90e2;
  }
`;

const PlayItem = styled.div`
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PlayTime = styled.div`
  font-size: 0.75rem;
  color: #999;
  min-width: 60px;
`;

const PlayPlayer = styled.div`
  font-weight: 500;
  color: #333;
  min-width: 100px;
`;

const PlayCards = styled.div`
  flex: 1;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const CardChip = styled.span<{ isJoker: boolean }>`
  background: ${(props) => (props.isJoker ? "#ff6b6b" : "#4a90e2")};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
`;

interface GameHistoryDetailProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameHistory | null;
}

const GameHistoryDetail: React.FC<GameHistoryDetailProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  if (!isOpen || !history) return null;

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getRankLabel = (rank: number) => {
    if (rank === 1) return "🥇 1등";
    if (rank === 2) return "🥈 2등";
    if (rank === 3) return "🥉 3등";
    return `${rank}등`;
  };

  // 닉네임 맵 캐싱 (성능 최적화)
  const playerNicknameMap = React.useMemo(() => {
    return new Map(history.players.map((p) => [p.playerId, p.nickname]));
  }, [history]);

  // 라운드별로 플레이 기록 그룹화
  const groupedPlays: Record<number, RoundPlay[]> = {};
  history.roundPlays.forEach((play) => {
    if (!groupedPlays[play.round]) {
      groupedPlays[play.round] = [];
    }
    groupedPlays[play.round].push(play);
  });

  const getPlayerNickname = (playerId: string) => {
    return playerNicknameMap.get(playerId) || "알 수 없음";
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>게임 {history.gameNumber} 상세 기록</Title>
        <Subtitle>
          {formatDate(history.startedAt)} ~ {formatDate(history.endedAt)} | 총{" "}
          {history.totalRounds} 라운드
        </Subtitle>

        <Section>
          <SectionTitle>최종 순위</SectionTitle>
          <PlayerGrid>
            {history.players.map((player) => (
              <PlayerCard key={player.playerId}>
                <PlayerRank rank={player.rank}>
                  {getRankLabel(player.rank)}
                </PlayerRank>
                <PlayerName>{player.nickname}</PlayerName>
                <PlayerStat>
                  완료: {player.finishedAtRound} 라운드
                </PlayerStat>
                <PlayerStat>플레이: {player.totalCardsPlayed} 장</PlayerStat>
                <PlayerStat>패스: {player.totalPasses} 회</PlayerStat>
              </PlayerCard>
            ))}
          </PlayerGrid>
        </Section>

        <Section>
          <SectionTitle>플레이 기록</SectionTitle>
          <Timeline>
            {Object.keys(groupedPlays)
              .map(Number)
              .sort((a, b) => a - b)
              .map((round) => (
                <RoundGroup key={round}>
                  <RoundHeader>라운드 {round}</RoundHeader>
                  {groupedPlays[round].map((play) => (
                    <PlayItem key={`${play.playerId}-${play.timestamp}`}>
                      <PlayTime>{formatTime(play.timestamp)}</PlayTime>
                      <PlayPlayer>{getPlayerNickname(play.playerId)}</PlayPlayer>
                      <PlayCards>
                        {play.cards.map((card, cardIdx) => (
                          <CardChip key={`${card.rank}-${card.isJoker}-${cardIdx}`} isJoker={card.isJoker}>
                            {card.isJoker ? "조커" : card.rank}
                          </CardChip>
                        ))}
                      </PlayCards>
                    </PlayItem>
                  ))}
                </RoundGroup>
              ))}
          </Timeline>
        </Section>
      </Modal>
    </Overlay>
  );
};

export default GameHistoryDetail;
