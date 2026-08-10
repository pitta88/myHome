import api from './client';
import type { MaintenanceLog, CreateLogRequest, UpdateLogRequest } from '../types';

export const getLogs = async (itemId?: number): Promise<MaintenanceLog[]> => {
  const params = itemId ? { itemId } : {};
  const res = await api.get('/logs', { params });
  return res.data;
};

export const getRecentLogs = async (): Promise<MaintenanceLog[]> => {
  const res = await api.get('/logs/recent');
  return res.data;
};

export const createLog = async (data: CreateLogRequest): Promise<MaintenanceLog> => {
  const res = await api.post('/logs', data);
  return res.data;
};

export const updateLog = async (id: number, data: UpdateLogRequest): Promise<MaintenanceLog> => {
  const res = await api.put(`/logs/${id}`, data);
  return res.data;
};

export const deleteLog = async (id: number) => {
  await api.delete(`/logs/${id}`);
};

export const uploadPhoto = async (logId: number, file: File) => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await api.post(`/logs/${logId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data as { photoPath: string };
};

export const uploadAttachment = async (logId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/logs/${logId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const deleteAttachment = async (logId: number, attachmentId: number) => {
  await api.delete(`/logs/${logId}/attachments/${attachmentId}`);
};
