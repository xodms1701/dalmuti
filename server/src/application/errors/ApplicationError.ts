/**
 * ApplicationError.ts
 *
 * Application Layer 에러 계층 정의
 *
 * Domain Layer의 에러와 구분하여 Application Layer에서 발생하는
 * 에러를 표현합니다. HTTP 상태 코드와 매핑 가능한 구조입니다.
 */

/**
 * Application Layer 기본 에러
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'ApplicationError';
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

/**
 * 입력 검증 에러
 *
 * DTO 검증이나 입력값 검증 실패 시 사용
 * HTTP 400 Bad Request에 매핑
 */
export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 비즈니스 규칙 위반 에러
 *
 * Domain Layer의 비즈니스 규칙 위반 시 사용
 * HTTP 422 Unprocessable Entity에 매핑
 */
export class BusinessRuleError extends ApplicationError {
  constructor(message: string, code: string = 'BUSINESS_RULE_VIOLATION') {
    super(message, code, 422);
    this.name = 'BusinessRuleError';
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }
}

/**
 * 리소스 없음 에러
 *
 * 요청한 리소스(게임, 플레이어 등)를 찾을 수 없을 때 사용
 * HTTP 404 Not Found에 매핑
 */
export class ResourceNotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'RESOURCE_NOT_FOUND', 404);
    this.name = 'ResourceNotFoundError';
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

/**
 * 권한 없음 에러
 *
 * 플레이어가 특정 액션을 수행할 권한이 없을 때 사용
 * HTTP 403 Forbidden에 매핑
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 403);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 중복 리소스 에러
 *
 * 이미 존재하는 리소스를 생성하려 할 때 사용
 * HTTP 409 Conflict에 매핑
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
