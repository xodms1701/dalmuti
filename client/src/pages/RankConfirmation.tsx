import React from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

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

const RankList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 600px;
  margin-bottom: 2rem;
`;

const PlayerItem = styled.div<{ rank: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid
    ${({ rank }) => {
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
`;

const PlayerName = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
`;

const RankBadge = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  color: #666;
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const NextGameInfo = styled.div`
  background: #e3f0fc;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  max-width: 600px;
  width: 100%;
  text-align: center;
`;

const NextGameText = styled.p`
  font-size: 1.1rem;
  color: #333;
  margin: 0.5rem 0;
  line-height: 1.6;
`;

const Countdown = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #4a90e2;
  margin-top: 1rem;
`;

const RankConfirmation: React.FC = () => {
  const { socketId } = useSocketContext();
  const { game } = useGameStore();
  const navigate = useNavigate();
  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    if (game?.phase === "cardSelection") {
      navigate("/select-card-deck");
    }
  }, [game?.phase, navigate]);

  React.useEffect(() => {
    // 페이지 마운트 시 phase가 roleSelectionComplete이면 즉시 타이머 시작
    if (game?.phase === "roleSelectionComplete") {
      setCountdown(5); // 카운트다운 리셋
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [game?.phase, navigate]);

  if (!game) return null;

  // 플레이어들을 rank 순서대로 정렬
  const sortedPlayers = [...game.players].sort(
    (a, b) => (a.rank || 0) - (b.rank || 0)
  );

  return (
    <Container>
      <Title>다음 게임 순위 확인</Title>
      <Info>이전 게임의 순위에 따라 계급이 재배정되었습니다.</Info>
      <RankList>
        {sortedPlayers.map((player) => (
          <PlayerItem key={player.id} rank={player.rank || 0}>
            <PlayerName>
              {player.nickname}
              {player.id === socketId && " (나)"}
            </PlayerName>
            <RankBadge>{player.rank}등</RankBadge>
          </PlayerItem>
        ))}
      </RankList>
      <NextGameInfo>
        <NextGameText>
          위 순서대로 다음 게임이 진행됩니다.
        </NextGameText>
        <NextGameText>
          1등부터 순서대로 카드 덱을 선택합니다.
        </NextGameText>
        {countdown > 0 ? (
          <Countdown>{countdown}초 후 시작...</Countdown>
        ) : (
          <Countdown>곧 시작합니다...</Countdown>
        )}
      </NextGameInfo>
    </Container>
  );
};

export default RankConfirmation;
