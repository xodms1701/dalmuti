import React from 'react';
import { Player, Role } from '../../types';

interface RoleAssignmentProps {
  players: Player[];
  currentPlayer: Player;
}

export const RoleAssignment: React.FC<RoleAssignmentProps> = ({ players, currentPlayer }) => {
  const getRoleName = (role: Role) => {
    switch (role) {
      case Role.KING: return '왕';
      case Role.QUEEN: return '여왕';
      case Role.PRINCE: return '왕자';
      case Role.PRINCESS: return '공주';
      case Role.DUKE: return '공작';
      case Role.DUCHESS: return '공작부인';
      case Role.KNIGHT: return '기사';
      case Role.SERF: return '농노';
      default: return '';
    }
  };

  return (
    <div className="role-assignment">
      <h2>역할 할당</h2>
      <div className="players-roles">
        {players.map(player => (
          <div key={player.id} className={`player-role ${player.id === currentPlayer.id ? 'current' : ''}`}>
            <span className="nickname">{player.nickname}</span>
            {player.role && (
              <span className="role-badge">{getRoleName(player.role)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 