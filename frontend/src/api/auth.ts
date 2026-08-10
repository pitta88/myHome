import api from './client';

export const login = async (username: string, password: string) => {
  const res = await api.post('/auth/login', { username, password });
  return res.data as { token: string; username: string };
};

export const register = async (username: string, password: string) => {
  const res = await api.post('/auth/register', { username, password });
  return res.data as { token: string; username: string };
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const res = await api.post('/auth/change-password', { currentPassword, newPassword });
  return res.data as { token: string; username: string };
};
