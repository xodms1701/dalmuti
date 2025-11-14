/**
 * Repository Layer의 에러 베이스 클래스
 */
export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}

/**
 * 리소스를 찾을 수 없을 때 발생
 */
export class NotFoundError extends RepositoryError {
  constructor(resourceType: string, id: string) {
    super(`${resourceType} not found: ${id}`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 중복 리소스가 있을 때 발생
 */
export class DuplicateError extends RepositoryError {
  constructor(resourceType: string, id: string) {
    super(`${resourceType} already exists: ${id}`);
    this.name = 'DuplicateError';
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}

/**
 * 데이터베이스 연결 오류
 */
export class ConnectionError extends RepositoryError {
  constructor(message: string) {
    super(`Database connection error: ${message}`);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}
