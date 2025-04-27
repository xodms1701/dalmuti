import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "../contexts/SocketContext";
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

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useSocketContext();
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      <Title>달무티</Title>
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
    </Container>
  );
};

export default Lobby;
