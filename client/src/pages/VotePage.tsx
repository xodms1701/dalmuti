import React from "react";
import { useGameStore } from "../store/gameStore";
import { useSocketContext } from "../contexts/SocketContext";
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

const VoteStatus = styled.div`
  margin-top: 2rem;
  background: #e9ecef;
  border-radius: 8px;
  padding: 1rem 2rem;
  min-width: 250px;
`;

const VotePage: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, vote } = useSocketContext();
  const navigate = useNavigate();

  React.useEffect(() => {
    // 투표가 끝나면(phase가 gameEnd가 아니거나 isVoting이 false) 로비로 이동
    if (!game?.isVoting) {
      navigate("/rank-confirmation");
    }
  }, [game?.isVoting, navigate]);

  if (!game?.isVoting) return null;

  const myVote = socketId ? game.votes[socketId] : undefined;

  return (
    <Container>
      <Title>게임이 종료되었습니다!</Title>
      <p>다시 한 번 플레이하시겠습니까?</p>
      <div>
        <Button
          onClick={() => socketId && vote(game.roomId, true)}
          disabled={myVote === true || !socketId}
        >
          예
        </Button>
        <Button
          onClick={() => socketId && vote(game.roomId, false)}
          disabled={myVote === false || !socketId}
        >
          아니오
        </Button>
      </div>
      <VoteStatus>
        <b>투표 현황</b>
        {game.players.map((p) => (
          <div key={p.id}>
            {p.nickname}:{" "}
            {game.votes[p.id] === undefined
              ? "대기 중"
              : game.votes[p.id]
              ? "예"
              : "아니오"}
          </div>
        ))}
      </VoteStatus>
    </Container>
  );
};

export default VotePage;
