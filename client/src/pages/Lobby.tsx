import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "../contexts/SocketContext";
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

const Title = styled.h1`
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 2rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #357abd;
  }
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1rem 0;
  color: #666;
  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #ddd;
  }
  &::before {
    margin-right: 1rem;
  }
  &::after {
    margin-left: 1rem;
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

const GameInfo = styled.div`
  background: #e3f0fc;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 400px;
  width: 100%;
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
`;

const InfoTitle = styled.h3`
  font-size: 1.1rem;
  color: #333;
  margin: 0;
`;

const InfoText = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 0;
`;

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useSocketContext();
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await createRoom(playerName);
      if (response.success && response.data) {
        navigate(`/room`);
      } else {
        setError(response.error || "방 생성에 실패했습니다.");
      }
    } catch (error) {
      setError("방 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !inviteCode.trim()) {
      setError("이름과 초대코드를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    const response = await joinRoom(inviteCode, playerName);
    if (response.success) {
      navigate(`/room`);
    } else {
      setError(response.error || "방 참가에 실패했습니다.");
    }
    setIsLoading(false);
  };

  return (
    <Container>
      <Title>위대한 달무티</Title>

      <GameInfo>
        <InfoTitle>🎮 게임 소개</InfoTitle>
        <InfoText>
          • 4~8명이 함께 즐기는 카드 게임
        </InfoText>
        <InfoText>
          • 낮은 숫자가 강한 카드! (1이 가장 강함)
        </InfoText>
        <InfoText>
          • 카드를 가장 먼저 없애는 사람이 승리
        </InfoText>
      </GameInfo>

      <Card>
        <Form onSubmit={handleCreateRoom}>
          <h2>새로운 방 만들기</h2>
          <Input
            type="text"
            placeholder="이름을 입력하세요"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "처리 중..." : "방 만들기"}
          </Button>
        </Form>

        <Divider>또는</Divider>

        <Form onSubmit={handleJoinRoom}>
          <h2>기존 방 참가하기</h2>
          <Input
            type="text"
            placeholder="이름을 입력하세요"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading}
          />
          <Input
            type="text"
            placeholder="초대코드를 입력하세요"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "처리 중..." : "방 참가하기"}
          </Button>
        </Form>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Card>

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="lobby"
      />
    </Container>
  );
};

export default Lobby;
