import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import styled from 'styled-components';

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

const ErrorMessage = styled.div`
    color: red;
    font-size: 0.9rem;
`;

const Lobby: React.FC = () => {
    const navigate = useNavigate();
    const { createRoom, joinRoom } = useSocket();
    const [playerName, setPlayerName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerName.trim()) {
            setError('이름을 입력해주세요.');
            return;
        }

        const response = await createRoom(playerName);
        if (response.success && response.inviteCode) {
            navigate(`/room/${response.inviteCode}`);
        } else {
            setError(response.error || '방 생성에 실패했습니다.');
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerName.trim() || !inviteCode.trim()) {
            setError('이름과 초대코드를 입력해주세요.');
            return;
        }

        const response = await joinRoom(inviteCode, playerName);
        if (response.success) {
            navigate(`/room/${inviteCode}`);
        } else {
            setError(response.error || '방 참가에 실패했습니다.');
        }
    };

    return (
        <Container>
            <Form onSubmit={handleCreateRoom}>
                <h2>새로운 방 만들기</h2>
                <Input
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
                <Button type="submit">방 만들기</Button>
            </Form>

            <Form onSubmit={handleJoinRoom}>
                <h2>기존 방 참가하기</h2>
                <Input
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
                <Input
                    type="text"
                    placeholder="초대코드를 입력하세요"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />
                <Button type="submit">방 참가하기</Button>
            </Form>

            {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
    );
};

export default Lobby; 