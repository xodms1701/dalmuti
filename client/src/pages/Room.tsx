import React from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const RoomInfo = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
`;

const RoomTitle = styled.h1`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
`;

const RoomCode = styled.div`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 1rem;
`;

const PlayerList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 800px;
`;

const PlayerCard = styled.div<{ $isHost: boolean; $isReady: boolean }>`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid
    ${({ $isHost, $isReady }) =>
      $isHost ? "#4a90e2" : $isReady ? "#4caf50" : "#ddd"};
`;

const PlayerName = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const PlayerStatus = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const ButtonContainer = styled.div`
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
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

  &:hover {
    background-color: ${({ disabled }) => (disabled ? "#ccc" : "#357abd")};
  }
`;

const Room: React.FC = () => {
  const { socketId, ready, startGame } = useSocketContext();
  const { game } = useGameStore();
  const navigate = useNavigate();

  const isHost = game?.ownerId === socketId;

  const handleReady = async () => {
    if (!socketId || !game?.roomId) return;
    const response = await ready(game.roomId, socketId);
    if (!response.success) {
      alert(response.error || "준비 중 오류가 발생했습니다.");
    }
  };

  const handleStartGame = async () => {
    if (!game?.roomId) return;
    const response = await startGame(game.roomId);
    if (!response.success) {
      alert(response.error || "게임 시작 중 오류가 발생했습니다.");
    }
  };

  React.useEffect(() => {
    if (game?.phase === "roleSelection") {
      navigate("/role-selection");
    }
  }, [game?.phase, navigate]);

  if (!game) {
    return <Container>로딩 중...</Container>;
  }

  const currentPlayer = game.players.find((p) => p.id === socketId);
  const canStartGame =
    isHost &&
    game.players.length >= 4 &&
    game.players.length <= 8 &&
    game.players.every((player) => player.isReady);

  return (
    <Container>
      <RoomInfo>
        <RoomTitle>게임 준비 방</RoomTitle>
        <RoomCode>방 코드: {game.roomId}</RoomCode>
      </RoomInfo>

      <PlayerList>
        {game.players.map((player) => (
          <PlayerCard
            key={player.id}
            $isHost={player.id === game.ownerId}
            $isReady={player.isReady}
          >
            <PlayerName>
              {player.nickname + (player.id === socketId ? " (나)" : "")}
              {player.id === game.ownerId && " 👑"}
            </PlayerName>
            <PlayerStatus>
              {player.isReady ? "준비 완료" : "준비 중"}
            </PlayerStatus>
          </PlayerCard>
        ))}
      </PlayerList>

      <ButtonContainer>
        {currentPlayer && !currentPlayer.isReady && (
          <Button onClick={handleReady}>준비하기</Button>
        )}
        {isHost && (
          <Button onClick={handleStartGame} disabled={!canStartGame}>
            게임 시작
          </Button>
        )}
      </ButtonContainer>
    </Container>
  );
};

export default Room;
