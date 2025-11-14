/**
 * BaseResponse.ts
 *
 * 모든 Use Case Response의 기본 형태 정의
 *
 * Use Case는 항상 성공/실패를 명확히 구분하는 응답을 반환하며,
 * 이를 통해 Presentation Layer에서 일관된 에러 처리가 가능합니다.
 */

/**
 * 모든 Response의 기본 인터페이스
 */
export interface BaseResponse {
  success: boolean;
  message?: string;
  timestamp: Date;
}

/**
 * 성공 응답
 *
 * @template TData - 반환할 데이터의 타입 (void인 경우 data 없음)
 */
export interface SuccessResponse<TData = void> extends BaseResponse {
  success: true;
  data: TData;
}

/**
 * 실패 응답
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Use Case의 반환 타입
 *
 * 성공 또는 실패 응답 중 하나를 반환합니다.
 *
 * @template TData - 성공 시 반환할 데이터의 타입
 */
export type UseCaseResponse<TData = void> = SuccessResponse<TData> | ErrorResponse;

/**
 * 성공 응답 생성 헬퍼 함수
 */
export function createSuccessResponse<TData>(
  data: TData,
  message?: string
): SuccessResponse<TData> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date(),
  };
}

/**
 * 에러 응답 생성 헬퍼 함수
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date(),
  };
}
