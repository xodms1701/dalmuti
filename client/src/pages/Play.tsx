import React, { useState, useEffect } from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useGameStore } from "../store/gameStore";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
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

const Title = styled.h2`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`;

const CardList = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 2rem 0;
`;

const Card = styled.div<{ selected: boolean; disabled?: boolean }>`
  width: 60px;
  height: 90px;
  border-radius: 8px;
  border: 2px solid
    ${({ selected, disabled }) =>
      disabled ? "#e0e0e0" : selected ? "#4a90e2" : "#ccc"};
  background: ${({ selected, disabled }) =>
    disabled ? "#f5f5f5" : selected ? "#e3f0fc" : "#fff"};
  color: ${({ disabled }) => (disabled ? "#aaa" : "#333")};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:hover {
    ${({ disabled, selected }) =>
      !disabled &&
      `
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      border-color: ${selected ? "#357abd" : "#999"};
    `}
  }
`;

const Info = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const TurnInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const TurnOrder = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const PlayerName = styled.span<{ isCurrent: boolean }>`
  color: ${({ isCurrent }) => (isCurrent ? "#4a90e2" : "#666")};
  font-weight: ${({ isCurrent }) => (isCurrent ? "bold" : "normal")};
`;

const ResultInfo = styled.div`
  margin-top: 2rem;
  padding: 1rem 2rem;
  background-color: #e9ecef;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RankRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const RankItem = styled.div<{ isMe: boolean }>`
  font-weight: ${({ isMe }) => (isMe ? "bold" : "normal")};
  color: ${({ isMe }) => (isMe ? "#4a90e2" : "#333")};
  background: ${({ isMe }) => (isMe ? "#e3f0fc" : "transparent")};
  border-radius: 6px;
  padding: 0.2rem 0.7rem;
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

const GuideBox = styled.div`
  background: #e3f0fc;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  max-width: 800px;
  width: 100%;
`;

const GuideText = styled.p`
  font-size: 0.95rem;
  color: #333;
  margin: 0.5rem 0;
  line-height: 1.5;
`;

const Highlight = styled.span`
  color: #4a90e2;
  font-weight: bold;
`;

const CurrentTurnBanner = styled.div<{ isMyTurn: boolean }>`
  background: ${({ isMyTurn }) => (isMyTurn ? "#28a745" : "#ffc107")};
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1rem;
  max-width: 800px;
  width: 100%;
`;

const PlayPage: React.FC = () => {
  const { game } = useGameStore();
  const { socketId, playCard, pass } = useSocketContext();
  const [selectedIdxs, setSelectedIdxs] = useState<number[]>([]);
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (game?.isVoting) {
      navigate("/vote");
    }
  }, [game?.isVoting, navigate]);

  if (!game) return <Container>로딩 중...</Container>;

  const me = game.players.find((p) => p.id === socketId);

  // 카드 선택 가능 여부 판단 로직
  const isCardSelectable = (idx: number): boolean => {
    if (!me) return false;

    // 내 차례가 아니면 모든 카드 선택 불가
    if (!isMyTurn) return false;

    const card = me.cards[idx];

    // 이전 플레이가 있는 경우, 그보다 낮은 숫자만 선택 가능
    if (game.lastPlay && game.lastPlay.cards.length > 0) {
      const lastCard = game.lastPlay.cards[0];
      // 조커가 아닌 카드는 이전 카드보다 낮은 숫자여야 함
      if (!card.isJoker && card.rank >= lastCard.rank) {
        return false;
      }
    }

    // 아무것도 선택하지 않았으면 위 조건을 만족하는 모든 카드 선택 가능
    if (selectedIdxs.length === 0) return true;

    // 이미 선택된 카드는 선택 해제 가능
    if (selectedIdxs.includes(idx)) return true;

    // 선택된 카드들 가져오기
    const selectedCards = selectedIdxs.map((i) => me.cards[i]);

    // 조커는 항상 선택 가능 (이미 위에서 이전 플레이 체크 완료)
    if (card.isJoker) return true;

    // 선택된 카드 중 조커가 아닌 첫 번째 카드 찾기
    const firstNonJokerCard = selectedCards.find((c) => !c.isJoker);

    // 선택된 카드가 모두 조커인 경우, 현재 카드가 조커가 아니면 선택 가능
    if (!firstNonJokerCard) {
      return !card.isJoker;
    }

    // 선택된 카드와 같은 숫자이거나 조커여야 선택 가능
    return card.rank === firstNonJokerCard.rank || card.isJoker;
  };

  const toggleCard = (idx: number) => {
    if (!isCardSelectable(idx)) return;

    setSelectedIdxs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handlePlayCard = async () => {
    if (!me || selectedIdxs.length === 0 || !game?.roomId || !socketId) return;
    const cardsToPlay = selectedIdxs.map((idx) => me.cards[idx]);
    await playCard(game.roomId, socketId, cardsToPlay);
    setSelectedIdxs([]);
  };

  const handlePass = async () => {
    if (!game?.roomId || !socketId) return;
    await pass(game.roomId, socketId);
    setSelectedIdxs([]);
  };

  // 순위 순서대로 정렬된 플레이어 목록
  const sortedPlayers = [...game.players].sort(
    (a, b) => (a.rank || 0) - (b.rank || 0)
  );

  const isMyTurn = game.currentTurn === socketId;
  const currentPlayer = game.players.find((p) => p.id === game.currentTurn);

  return (
    <Container>
      <Title>게임 진행 중</Title>

      <CurrentTurnBanner isMyTurn={isMyTurn}>
        {isMyTurn
          ? "🎮 당신의 차례입니다!"
          : `${currentPlayer?.nickname}님의 차례입니다`}
      </CurrentTurnBanner>

      <GuideBox>
        <GuideText>
          💡 <Highlight>낮은 숫자</Highlight>가 강한 카드입니다! (1이 가장
          강함)
        </GuideText>
        <GuideText>
          • 이전 플레이어보다 <Highlight>낮은 숫자</Highlight>의 카드를
          내세요
        </GuideText>
        <GuideText>
          • <Highlight>같은 개수</Highlight>의 카드를 내야 합니다
        </GuideText>
        <GuideText>
          • 여러 장을 낼 때는 <Highlight>같은 숫자</Highlight>만 가능합니다
        </GuideText>
      </GuideBox>

      <TurnInfo>
        <Info>
          <b>플레이 순서:</b>
        </Info>
        <TurnOrder>
          {sortedPlayers.map((player) => (
            <PlayerName
              key={player.id}
              isCurrent={player.id === game.currentTurn}
            >
              {player.nickname}
              {player.id === socketId ? " (나)" : ""}
              {player.id !== sortedPlayers[sortedPlayers.length - 1].id &&
                " → "}
            </PlayerName>
          ))}
        </TurnOrder>
      </TurnInfo>

      <Info>
        <b>마지막 플레이:</b>{" "}
        {game.lastPlay?.cards
          ? `${
              game.players.find((p) => p.id === game.lastPlay?.playerId)
                ?.nickname
            } - ${game.lastPlay.cards
              .map((c) => (c.isJoker ? "🃏" : c.rank))
              .join(", ")} (${game.lastPlay.cards.length}장)`
          : "아직 아무도 내지 않음"}
      </Info>

      {isMyTurn && game.lastPlay && game.lastPlay.cards.length > 0 && (
        <Info style={{ color: "#28a745", fontWeight: "bold" }}>
          💡 {game.lastPlay.cards[0].rank}보다 낮은 숫자를{" "}
          {game.lastPlay.cards.length}장 내야 합니다
        </Info>
      )}

      <Info>
        <b>내 카드:</b>
        {selectedIdxs.length > 0 && (
          <span style={{ color: "#4a90e2", marginLeft: "0.5rem" }}>
            ({selectedIdxs.length}장 선택됨)
          </span>
        )}
        {!isMyTurn && (
          <span style={{ color: "#999", marginLeft: "0.5rem" }}>
            (내 차례가 아닙니다)
          </span>
        )}
      </Info>
      <CardList>
        {me?.cards.map((card, idx) => {
          const selectable = isCardSelectable(idx);
          return (
            <Card
              key={idx}
              selected={selectedIdxs.includes(idx)}
              disabled={!selectable}
              onClick={() => toggleCard(idx)}
            >
              {card.isJoker ? "🃏" : card.rank}
            </Card>
          );
        })}
      </CardList>

      {/* 카드 버튼 영역을 순위 박스보다 위에 배치 */}
      {socketId &&
        game.currentTurn === socketId &&
        !game.finishedPlayers.includes(socketId) && (
          <div>
            <Button
              onClick={handlePlayCard}
              disabled={selectedIdxs.length === 0}
            >
              카드 내기
            </Button>
            <Button
              onClick={() => setSelectedIdxs([])}
              disabled={selectedIdxs.length === 0}
            >
              선택 취소
            </Button>
            <Button onClick={handlePass}>패스</Button>
          </div>
        )}

      {/* 순위 박스는 항상 하단에 위치 */}
      <ResultInfo>
        {game.finishedPlayers.length > 0 && (
          <>
            <Info>
              <b>현재 순위:</b>
            </Info>
            <RankRow>
              {game.finishedPlayers.map((playerId, index) => {
                const player = game.players.find((p) => p.id === playerId);
                const isMe = me ? playerId === me.id : false;
                return (
                  <RankItem key={playerId} isMe={isMe}>
                    {index + 1}등: {player?.nickname}
                  </RankItem>
                );
              })}
            </RankRow>
          </>
        )}
        {me && game.finishedPlayers.includes(me.id) && (
          <Info>
            <b>
              내 순위:{" "}
              {game.finishedPlayers.findIndex((id) => id === me.id) + 1}등
            </b>
          </Info>
        )}
        {/* 게임이 끝나지 않은 사람은 "게임 종료 대기 중..." 메시지 */}
        {me && !game.finishedPlayers.includes(me.id) && (
          <Info>게임 종료 대기 중...</Info>
        )}
      </ResultInfo>

      <HelpButton onClick={() => setIsHelpOpen(true)}>?</HelpButton>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        type="play"
      />
    </Container>
  );
};

export default PlayPage;
