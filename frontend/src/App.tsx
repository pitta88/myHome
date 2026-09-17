import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import LogsPage from './pages/LogsPage';
import TodosPage from './pages/TodosPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    }
  }
});

function AppLayout() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string>(() => localStorage.getItem('username') || '');
  const [navOpen, setNavOpen] = useState(false);

  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('');
    queryClient.clear();
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-900">
      <Sidebar
        username={username}
        onLogout={handleLogout}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — the sidebar is off-canvas below lg */}
        <header className="flex items-center gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3 lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-white">MyHome</span>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
