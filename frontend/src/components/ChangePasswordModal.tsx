import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { changePassword } from '../api/auth';

interface ChangePasswordModalProps {
  onClose: () => void;
}

/** 서버(AuthController.MinPasswordLength)와 맞춰둔 값 */
const MIN_LENGTH = 10;

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: (data) => {
      // 비밀번호가 바뀌면 서버가 새 토큰을 준다. client.ts가 매 요청마다
      // localStorage에서 읽으므로 여기서 교체해두면 로그인 상태가 유지된다.
      localStorage.setItem('token', data.token);
      setDone(true);
      setTimeout(onClose, 1200);
    },
    onError: (err: unknown) => {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? '비밀번호 변경에 실패했습니다.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (next.length < MIN_LENGTH) {
      setError(`새 비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    if (next === current) {
      setError('새 비밀번호가 기존 비밀번호와 같습니다.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-white font-semibold">비밀번호 변경</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <p className="p-5 text-emerald-400 text-sm">✅ 비밀번호가 변경되었습니다.</p>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">현재 비밀번호 *</label>
              <input
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">
                새 비밀번호 * <span className="text-slate-500">({MIN_LENGTH}자 이상)</span>
              </label>
              <input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••••"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">새 비밀번호 확인 *</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••••"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? '변경 중...' : '변경'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
