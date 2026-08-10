import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { renderWithProviders } from '../test/utils';
import ChangePasswordModal from './ChangePasswordModal';

/** 폼을 채우는 헬퍼. 라벨로 찾으므로 접근성이 깨지면 테스트도 깨진다. */
async function fillForm(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/현재 비밀번호/), current);
  await user.type(screen.getByLabelText(/새 비밀번호 \*/), next);
  await user.type(screen.getByLabelText(/새 비밀번호 확인/), confirm);
  await user.click(screen.getByRole('button', { name: '변경' }));
}

const VALID = 'a-long-enough-password';

describe('ChangePasswordModal', () => {
  describe('클라이언트 검증 — 서버를 호출하기 전에 막는다', () => {
    it('새 비밀번호가 10자 미만이면 요청하지 않는다', async () => {
      // 핸들러를 등록하지 않았으므로, 요청이 나가면 onUnhandledRequest:'error'로 실패한다
      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);

      await fillForm('admin1234', 'short', 'short');

      expect(await screen.findByText(/10자 이상이어야 합니다/)).toBeInTheDocument();
    });

    it('확인란이 일치하지 않으면 요청하지 않는다', async () => {
      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);

      await fillForm('admin1234', VALID, `${VALID}-typo`);

      expect(await screen.findByText(/서로 일치하지 않습니다/)).toBeInTheDocument();
    });

    it('새 비밀번호가 기존과 같으면 요청하지 않는다', async () => {
      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);

      await fillForm(VALID, VALID, VALID);

      expect(await screen.findByText(/기존 비밀번호와 같습니다/)).toBeInTheDocument();
    });
  });

  describe('성공 경로', () => {
    it('새 토큰을 localStorage에 교체하고 성공 메시지를 보여준다', async () => {
      localStorage.setItem('token', 'old-token');
      server.use(
        http.post('/api/auth/change-password', () =>
          HttpResponse.json({ token: 'fresh-token', username: 'admin' })
        )
      );

      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
      await fillForm('admin1234', VALID, VALID);

      expect(await screen.findByText(/비밀번호가 변경되었습니다/)).toBeInTheDocument();
      // 토큰을 교체하지 않으면 이후 요청이 401이 나므로 이 단언이 핵심이다
      expect(localStorage.getItem('token')).toBe('fresh-token');
    });

    it('입력한 값을 그대로 서버에 보낸다', async () => {
      let body: unknown;
      server.use(
        http.post('/api/auth/change-password', async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ token: 't', username: 'admin' });
        })
      );

      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
      await fillForm('admin1234', VALID, VALID);

      await waitFor(() =>
        expect(body).toEqual({ currentPassword: 'admin1234', newPassword: VALID })
      );
    });

    it('성공하면 잠시 뒤 모달을 닫는다', async () => {
      const onClose = vi.fn();
      server.use(
        http.post('/api/auth/change-password', () =>
          HttpResponse.json({ token: 't', username: 'admin' })
        )
      );

      renderWithProviders(<ChangePasswordModal onClose={onClose} />);
      await fillForm('admin1234', VALID, VALID);

      await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 });
    });
  });

  describe('서버 오류', () => {
    it('서버가 보낸 메시지를 그대로 보여준다', async () => {
      server.use(
        http.post('/api/auth/change-password', () =>
          HttpResponse.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
        )
      );

      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
      await fillForm('wrong-password', VALID, VALID);

      expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    });

    it('메시지가 없는 오류에는 기본 문구를 보여준다', async () => {
      server.use(
        http.post('/api/auth/change-password', () => HttpResponse.json({}, { status: 500 }))
      );

      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
      await fillForm('admin1234', VALID, VALID);

      expect(await screen.findByText('비밀번호 변경에 실패했습니다.')).toBeInTheDocument();
    });

    it('실패하면 토큰을 건드리지 않는다', async () => {
      localStorage.setItem('token', 'old-token');
      server.use(
        http.post('/api/auth/change-password', () =>
          HttpResponse.json({ message: '실패' }, { status: 400 })
        )
      );

      renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
      await fillForm('wrong', VALID, VALID);

      await screen.findByText('실패');
      expect(localStorage.getItem('token')).toBe('old-token');
    });
  });

  it('닫기 버튼은 onClose를 호출한다', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ChangePasswordModal onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole('button', { name: '취소' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
