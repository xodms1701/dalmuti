import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import styled from 'styled-components';

interface RoomState {
    inviteCode: string;
    playerCount: number;
    maxPlayers: number;
    minPlayers: number;
    canStartGame: boolean;
    players: Array<{
        socketId: string;
        name: string;
    }>;
}

interface GameState {
    players: string[];
    currentPlayer: string;
    lastPlayedCards: any[] | null;
    gameStarted: boolean;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    background-color: #f0f0f0;
    min-height: 100vh;
`;

const RoomInfo = styled.div`
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
    text-align: center;
`;

const PlayerList = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    width: 100%;
    max-width: 800px;
`;

const PlayerCard = styled.div<{ isCurrentPlayer: boolean }>`
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: ${props => props.isCurrentPlayer ? '2px solid #4CAF50' : 'none'};
`;

const Button = styled.button`
    padding: 0.5rem 1rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
    &:hover {
        background-color: #45a049;
    }
    &:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
`;

const Room: React.FC = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>();
    const navigate = useNavigate();
    const { startGame, onRoomStateChanged, onGameStarted } = useSocket();
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!inviteCode) return;

        const unsubscribeRoom = onRoomStateChanged((state: RoomState) => {
            setRoomState(state);
        });

        const unsubscribeGame = onGameStarted((state: GameState) => {
            setGameState(state);
            if (state.gameStarted) {
                navigate(`/game/${inviteCode}`);
            }
        });

        return () => {
            if (unsubscribeRoom) unsubscribeRoom();
            if (unsubscribeGame) unsubscribeGame();
        };
    }, [inviteCode, onRoomStateChanged, onGameStarted, navigate]);

    const handleStartGame = async () => {
        if (!inviteCode) return;

        const response = await startGame(inviteCode);
        if (!response.success) {
            setError(response.error || '게임 시작에 실패했습니다.');
        }
    };

    if (!roomState) {
        return <Container>로딩 중...</Container>;
    }

    return (
        <Container>
            <RoomInfo>
                <h2>방 코드: {roomState.inviteCode}</h2>
                <p>현재 인원: {roomState.playerCount} / {roomState.maxPlayers}</p>
                <p>최소 인원: {roomState.minPlayers}</p>
            </RoomInfo>

            <PlayerList>
                {roomState.players.map((player) => (
                    <PlayerCard
                        key={player.socketId}
                        isCurrentPlayer={gameState?.currentPlayer === player.socketId}
                    >
                        <h3>{player.name}</h3>
                        {gameState?.currentPlayer === player.socketId && <p>현재 턴</p>}
                    </PlayerCard>
                ))}
            </PlayerList>

            {!gameState && (
                <Button
                    onClick={handleStartGame}
                    disabled={!roomState.canStartGame}
                >
                    게임 시작
                </Button>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </Container>
    );
};

export default Room; 