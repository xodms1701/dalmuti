import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { socketManager } from '../utils/socket';
import { AppDispatch } from '../store';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 300px;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    background-color: #45a049;
  }
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 1rem;
`;

const Lobby: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && inviteCode.trim()) {
      socketManager.joinRoom(nickname, inviteCode);
      dispatch({ type: 'user/setNickname', payload: nickname });
      navigate(`/room/${inviteCode}`);
    }
  };

  const handleCreateRoom = () => {
    navigate('/create');
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>달무티 게임</Title>
        <Input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력하세요"
          required
        />
        <Input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="초대 코드를 입력하세요"
          required
        />
        <Button type="submit">게임 참가</Button>
      </Form>
      <Button onClick={handleCreateRoom} style={{ marginTop: '1rem' }}>
        새로운 방 만들기
      </Button>
    </Container>
  );
};

export default Lobby; 