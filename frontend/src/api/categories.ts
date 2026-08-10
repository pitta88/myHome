import api from './client';
import type { Category } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  const res = await api.get('/categories');
  return res.data;
};

export const createCategory = async (data: { name: string; icon: string; color: string }) => {
  const res = await api.post('/categories', data);
  return res.data as Category;
};

export const deleteCategory = async (id: number) => {
  await api.delete(`/categories/${id}`);
};
