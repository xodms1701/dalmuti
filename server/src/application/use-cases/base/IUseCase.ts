/**
 * IUseCase.ts
 *
 * Base Use Case Interface
 * 모든 Use Case는 이 인터페이스를 구현해야 함
 *
 * Hexagonal Architecture에서 Use Case는 Application Layer의 핵심으로,
 * 비즈니스 유스케이스를 표현하고 Domain Layer를 오케스트레이션합니다.
 */

/**
 * Use Case 인터페이스
 *
 * @template TRequest - Use Case의 입력 DTO
 * @template TResponse - Use Case의 출력 DTO
 */
export interface IUseCase<TRequest, TResponse> {
  /**
   * Use Case를 실행합니다
   *
   * @param request - Use Case 실행에 필요한 입력 데이터
   * @returns Use Case 실행 결과
   */
  execute(request: TRequest): Promise<TResponse>;
}
