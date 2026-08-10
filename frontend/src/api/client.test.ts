import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import api from './client';

const realLocation = Object.getOwnPropertyDescriptor(window, 'location')!;

/**
 * href 대입만 가로채는 location 스텁. href/origin은 유효한 값을 유지해야 한다 —
 * MSW가 상대경로를 절대 URL로 바꿀 때 location.href를 읽기 때문이다.
 */
function stubLocation(onAssign: (url: string) => void) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'http://localhost:5174',
      pathname: '/',
      get href() { return 'http://localhost:5174/'; },
      set href(v: string) { onAssign(v); },
    },
  });
}

/**
 * 인터셉터는 앱 전체의 인증 동작을 결정한다. 여기가 깨지면 토큰이 안 붙어
 * 모든 요청이 401이 되거나, 반대로 만료된 세션이 화면에 남는다.
 */
describe('api client 인터셉터', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 스텁을 남겨두면 다음 테스트의 URL 해석이 깨진다
  afterEach(() => {
    Object.defineProperty(window, 'location', realLocation);
  });

  describe('요청 — 토큰 주입', () => {
    it('저장된 토큰을 Bearer 헤더로 붙인다', async () => {
      localStorage.setItem('token', 'my-token');
      let auth: string | null = null;
      server.use(
        http.get('/api/items', ({ request }) => {
          auth = request.headers.get('Authorization');
          return HttpResponse.json([]);
        })
      );

      await api.get('/items');

      expect(auth).toBe('Bearer my-token');
    });

    it('토큰이 없으면 헤더를 붙이지 않는다', async () => {
      let auth: string | null = 'sentinel';
      server.use(
        http.get('/api/items', ({ request }) => {
          auth = request.headers.get('Authorization');
          return HttpResponse.json([]);
        })
      );

      await api.get('/items');

      expect(auth).toBeNull();
    });

    it('baseURL이 /api라 상대경로 앞에 붙는다', async () => {
      let url = '';
      server.use(
        http.get('/api/dashboard', ({ request }) => {
          url = new URL(request.url).pathname;
          return HttpResponse.json({});
        })
      );

      await api.get('/dashboard');

      expect(url).toBe('/api/dashboard');
    });
  });

  describe('응답 — 401 처리', () => {
    it('401이면 저장된 자격정보를 지운다', async () => {
      stubLocation(() => {});   // 리다이렉트는 다음 테스트에서 검증한다
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('username', 'admin');
      server.use(
        http.get('/api/items', () => HttpResponse.json({ message: 'nope' }, { status: 401 }))
      );

      await expect(api.get('/items')).rejects.toThrow();

      // 지우지 않으면 만료된 토큰으로 계속 재시도하게 된다
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('401이면 로그인 화면으로 보낸다', async () => {
      const assign = vi.fn();
      // jsdom은 실제 내비게이션을 지원하지 않으므로 location을 대체한다
      stubLocation(assign);

      localStorage.setItem('token', 'expired-token');
      server.use(http.get('/api/items', () => HttpResponse.json({}, { status: 401 })));

      await expect(api.get('/items')).rejects.toThrow();

      expect(assign).toHaveBeenCalledWith('/login');
    });

    it('401이 아닌 오류에는 자격정보를 건드리지 않는다', async () => {
      localStorage.setItem('token', 'valid-token');
      server.use(
        http.get('/api/items', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
      );

      await expect(api.get('/items')).rejects.toThrow();

      // 서버 장애로 로그아웃되면 안 된다
      expect(localStorage.getItem('token')).toBe('valid-token');
    });

    it('403에도 자격정보를 유지한다', async () => {
      localStorage.setItem('token', 'valid-token');
      server.use(http.get('/api/items', () => HttpResponse.json({}, { status: 403 })));

      await expect(api.get('/items')).rejects.toThrow();

      expect(localStorage.getItem('token')).toBe('valid-token');
    });

    it('성공 응답은 그대로 통과시킨다', async () => {
      server.use(http.get('/api/items', () => HttpResponse.json([{ id: 1, name: '잔디 깍기' }])));

      const res = await api.get('/items');

      expect(res.data).toEqual([{ id: 1, name: '잔디 깍기' }]);
    });
  });
});
