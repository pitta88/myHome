import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar username={username} onLogout={handleLogout} />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
