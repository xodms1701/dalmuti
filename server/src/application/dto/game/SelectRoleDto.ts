/**
 * SelectRoleDto.ts
 *
 * SelectRoleUseCase의 Request/Response DTO 정의
 */

/**
 * 역할 선택 요청
 */
export interface SelectRoleRequest {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 선택할 역할 번호 (1-13)
   */
  roleNumber: number;
}

/**
 * 역할 선택 응답
 */
export interface SelectRoleResponse {
  /**
   * 방 ID
   */
  roomId: string;

  /**
   * 플레이어 ID
   */
  playerId: string;

  /**
   * 선택된 역할 번호
   */
  selectedRole: number;

  /**
   * 모든 플레이어가 역할을 선택했는지 여부
   */
  allRolesSelected: boolean;
}
