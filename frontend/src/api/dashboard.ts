import api from './client';
import type { Dashboard } from '../types';

export const getDashboard = async (): Promise<Dashboard> => {
  const res = await api.get('/dashboard');
  return res.data;
};
