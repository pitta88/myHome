import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// onUnhandledRequest: 'error' — 핸들러를 등록하지 않은 요청이 조용히 통과하면
// 테스트가 뭘 검증하는지 알 수 없게 되므로 즉시 실패시킨다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => server.close());
