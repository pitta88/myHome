import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Wrench, ClipboardList, CheckSquare, LogOut, ChevronDown, ChevronRight, KeyRound } from 'lucide-react';
import { getCategories } from '../api/categories';
import ChangePasswordModal from './ChangePasswordModal';

interface SidebarProps {
  username: string;
  onLogout: () => void;
}

export default function Sidebar({ username, onLogout }: SidebarProps) {
  const location = useLocation();
  const isLogsActive = location.pathname === '/logs';
  const isTodosActive = location.pathname === '/todos';
  const [logsOpen, setLogsOpen] = useState(isLogsActive);
  const [todosOpen, setTodosOpen] = useState(isTodosActive);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const currentCategory = new URLSearchParams(location.search).get('category');

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-xl">
            🏠
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">MyHome</h1>
            <p className="text-slate-400 text-xs">홈 관리 시스템</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {/* 대시보드 */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`
          }
        >
          <LayoutDashboard size={18} />
          대시보드
        </NavLink>

        {/* 관리 항목 */}
        <NavLink
          to="/items"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`
          }
        >
          <Wrench size={18} />
          관리 항목
        </NavLink>

        {/* 작업 기록 (카테고리 하위 메뉴) */}
        <div>
          <button
            onClick={() => setLogsOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLogsActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ClipboardList size={18} />
            <span className="flex-1 text-left">작업 기록</span>
            {logsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {logsOpen && (
            <div className="mt-1 ml-4 space-y-0.5">
              {/* 전체 */}
              <NavLink
                to="/logs"
                end
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isLogsActive && !currentCategory
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="w-4 text-center">📋</span>
                전체
              </NavLink>

              {/* 카테고리별 */}
              {categories.map(cat => (
                <NavLink
                  key={cat.id}
                  to={`/logs?category=${cat.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentCategory === String(cat.id)
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span className="w-4 text-center">{cat.icon}</span>
                  {cat.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        {/* 할 일 (카테고리 하위 메뉴) */}
        <div>
          <button
            onClick={() => setTodosOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isTodosActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <CheckSquare size={18} />
            <span className="flex-1 text-left">할 일</span>
            {todosOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {todosOpen && (
            <div className="mt-1 ml-4 space-y-0.5">
              <NavLink
                to="/todos"
                end
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isTodosActive && !currentCategory
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="w-4 text-center">✅</span>
                전체
              </NavLink>
              {categories.map(cat => (
                <NavLink
                  key={cat.id}
                  to={`/todos?category=${cat.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentCategory === String(cat.id) && isTodosActive
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span className="w-4 text-center">{cat.icon}</span>
                  {cat.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-300 text-sm">{username}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPasswordOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="비밀번호 변경"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </aside>
  );
}
