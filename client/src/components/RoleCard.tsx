import React from "react";
import styled from "styled-components";
import { useGameStore } from "../store/gameStore";

interface RoleCardProps {
  number: number;
  flipped: boolean;
  disabled: boolean;
  onClick: () => void;
}

const Card = styled.div<{ flipped: boolean }>`
  width: 120px;
  height: 180px;
  perspective: 1000px;
  cursor: ${(props) => (props.flipped ? "default" : "pointer")};
`;

const CardInner = styled.div<{ flipped: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  transform: ${(props) =>
    props.flipped ? "rotateY(180deg)" : "rotateY(0deg)"};
`;

const CardFront = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
`;

const CardBack = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  background-color: #4a90e2;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotateY(180deg);
  color: white;
`;

const SelectedBy = styled.div`
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
`;

const RoleCard: React.FC<RoleCardProps> = ({
  number,
  flipped,
  disabled,
  onClick,
}) => {
  const { game } = useGameStore();
  const selectedBy = game?.roleSelectionDeck.find(
    (card) => card.number === number
  )?.selectedBy;
  const player = game?.players.find((p) => p.id === selectedBy);

  return (
    <Card
      flipped={flipped}
      onClick={!flipped && !disabled ? onClick : undefined}
    >
      <CardInner flipped={flipped}>
        <CardFront>?</CardFront>
        <CardBack>
          <div>{number}</div>
          {player && <SelectedBy>{player.nickname}</SelectedBy>}
        </CardBack>
      </CardInner>
    </Card>
  );
};

export default RoleCard;
