import api from './client';
import type { MaintenanceItem, CreateItemRequest, UpdateItemRequest } from '../types';

export const getItems = async (): Promise<MaintenanceItem[]> => {
  const res = await api.get('/items');
  return res.data;
};

export const createItem = async (data: CreateItemRequest): Promise<MaintenanceItem> => {
  const res = await api.post('/items', data);
  return res.data;
};

export const updateItem = async (id: number, data: UpdateItemRequest): Promise<MaintenanceItem> => {
  const res = await api.put(`/items/${id}`, data);
  return res.data;
};

export const deleteItem = async (id: number) => {
  await api.delete(`/items/${id}`);
};
