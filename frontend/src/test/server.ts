import { setupServer } from 'msw/node';

/**
 * HTTP를 네트워크 계층에서 가로챈다. axios를 vi.mock으로 대체하지 않는 이유는
 * client.ts의 인터셉터(토큰 주입, 401 처리)가 실제로 실행되어야 하기 때문이다.
 * 핸들러는 각 테스트가 server.use()로 직접 등록한다.
 */
export const server = setupServer();
