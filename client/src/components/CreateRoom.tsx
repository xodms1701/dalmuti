import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { socketManager } from '../utils/socket';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

const CreateRoom: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();
  const { userId } = useSelector((state: RootState) => state.user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && roomName.trim()) {
      socketManager.createRoom(nickname, roomName);
      navigate('/lobby');
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>방 만들기</Title>
        <Input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력하세요"
          required
        />
        <Input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="방 이름을 입력하세요"
          required
        />
        <Button type="submit">방 만들기</Button>
      </Form>
    </Container>
  );
};

export default CreateRoom; 