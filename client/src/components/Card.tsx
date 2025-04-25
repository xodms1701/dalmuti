import React from 'react';
import styled from 'styled-components';

interface CardProps {
    number: number;
    isSelected?: boolean;
    onClick?: () => void;
}

const CardContainer = styled.div<{ isSelected: boolean }>`
    width: 80px;
    height: 120px;
    background-color: white;
    border-radius: 8px;
    border: ${props => props.isSelected ? '3px solid #4CAF50' : '1px solid #ddd'};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    margin: 0.5rem;

    &:hover {
        transform: translateY(-5px);
    }
`;

const CardNumber = styled.div`
    font-size: 2rem;
    font-weight: bold;
    color: #333;
`;

const Card: React.FC<CardProps> = ({ number, isSelected = false, onClick }) => {
    return (
        <CardContainer isSelected={isSelected} onClick={onClick}>
            <CardNumber>{number}</CardNumber>
        </CardContainer>
    );
};

export default Card; 