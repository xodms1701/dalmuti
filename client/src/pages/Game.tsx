import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import styled from 'styled-components';
import Card from '../components/Card';

interface CardType {
    number: number;
    count: number;
}

interface GameState {
    players: string[];
    currentPlayer: string;
    lastPlayedCards: CardType[] | null;
    gameStarted: boolean;
    isRevolution: boolean;
}

interface PlayerHand {
    cards: CardType[];
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    background-color: #f0f0f0;
    min-height: 100vh;
`;

const GameInfo = styled.div`
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
    text-align: center;
    width: 100%;
    max-width: 800px;
`;

const CardArea = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin: 2rem 0;
    width: 100%;
    max-width: 800px;
`;

const LastPlayedCards = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin: 2rem 0;
    min-height: 120px;
    width: 100%;
    max-width: 800px;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    padding: 1rem;
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

const StatusText = styled.p<{ isError?: boolean }>`
    color: ${props => props.isError ? 'red' : 'inherit'};
    font-weight: bold;
    margin: 1rem 0;
`;

const Game: React.FC = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>();
    const navigate = useNavigate();
    const { playCards, onGameStateChanged, onPlayerHand, socketId } = useSocket();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerHand, setPlayerHand] = useState<PlayerHand | null>(null);
    const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!inviteCode) {
            navigate('/');
            return;
        }

        const unsubscribeGameState = onGameStateChanged((state: GameState) => {
            setGameState(state);
            if (!state.gameStarted) {
                navigate(`/room/${inviteCode}`);
            }
        });

        const unsubscribePlayerHand = onPlayerHand((hand: PlayerHand) => {
            setPlayerHand(hand);
        });

        return () => {
            if (unsubscribeGameState) unsubscribeGameState();
            if (unsubscribePlayerHand) unsubscribePlayerHand();
        };
    }, [inviteCode, navigate, onGameStateChanged, onPlayerHand]);

    const handleCardClick = (card: CardType) => {
        setSelectedCards(prev => {
            // 이미 선택된 카드인지 확인
            const isSelected = prev.some(c => c.number === card.number);
            
            if (isSelected) {
                // 선택 해제
                return prev.filter(c => c.number !== card.number);
            } else {
                // 새로운 카드 선택 시, 기존에 선택된 카드와 같은 숫자여야 함
                if (prev.length > 0 && prev[0].number !== card.number) {
                    setError('같은 숫자의 카드만 선택할 수 있습니다.');
                    return prev;
                }
                return [...prev, card];
            }
        });
    };

    const handlePlayCards = async () => {
        if (!inviteCode || !gameState || selectedCards.length === 0) return;

        const response = await playCards(inviteCode, selectedCards);
        if (response.success) {
            setSelectedCards([]);
            setError('');
        } else {
            setError(response.error || '카드를 낼 수 없습니다.');
        }
    };

    if (!gameState || !playerHand) {
        return <Container>로딩 중...</Container>;
    }

    const isCurrentPlayer = gameState.currentPlayer === socketId;

    return (
        <Container>
            <GameInfo>
                <h2>게임 진행 중</h2>
                {gameState.isRevolution && <p>혁명 상태: 숫자가 작은 카드가 이깁니다!</p>}
                <StatusText>{isCurrentPlayer ? '당신의 턴입니다!' : '다른 플레이어의 턴입니다.'}</StatusText>
            </GameInfo>

            <LastPlayedCards>
                <h3>마지막으로 낸 카드</h3>
                {gameState.lastPlayedCards?.map((card, index) => (
                    <Card key={index} number={card.number} />
                ))}
            </LastPlayedCards>

            <CardArea>
                <h3>내 카드</h3>
                {playerHand.cards.map((card, index) => (
                    <Card
                        key={index}
                        number={card.number}
                        isSelected={selectedCards.some(c => c.number === card.number)}
                        onClick={() => isCurrentPlayer && handleCardClick(card)}
                    />
                ))}
            </CardArea>

            {isCurrentPlayer && (
                <Button
                    onClick={handlePlayCards}
                    disabled={selectedCards.length === 0}
                >
                    카드 내기
                </Button>
            )}

            {error && <StatusText isError>{error}</StatusText>}
        </Container>
    );
};

export default Game; 