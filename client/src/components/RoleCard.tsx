import React from "react";
import styled, { css } from "styled-components";

const CardWrapper = styled.div<{ flipped: boolean; disabled: boolean }>`
  width: 80px;
  height: 120px;
  perspective: 600px;
  display: inline-block;
  margin: 0 8px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const CardInner = styled.div<{ flipped: boolean }>`
  width: 100%;
  height: 100%;
  transition: transform 0.5s;
  transform-style: preserve-3d;
  position: relative;
  ${({ flipped }) =>
    flipped
      ? css`
          transform: rotateY(180deg);
        `
      : ""}
`;

const CardFace = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
`;

const CardFront = styled(CardFace)`
  background: #4a90e2;
  color: white;
`;

const CardBack = styled(CardFace)`
  background: #fff;
  color: #333;
  border: 2px solid #4a90e2;
  transform: rotateY(180deg);
`;

interface RoleCardProps {
  number: number;
  flipped: boolean;
  disabled: boolean;
  onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  number,
  flipped,
  disabled,
  onClick,
}) => (
  <CardWrapper
    flipped={flipped}
    disabled={disabled}
    onClick={disabled ? undefined : onClick}
  >
    <CardInner flipped={flipped}>
      <CardFront>?</CardFront>
      <CardBack>{number}</CardBack>
    </CardInner>
  </CardWrapper>
);

export default RoleCard;
