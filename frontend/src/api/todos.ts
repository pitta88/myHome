import api from './client';
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types';

export const getTodos = async (): Promise<Todo[]> => {
  const res = await api.get('/todos');
  return res.data;
};

export const createTodo = async (data: CreateTodoRequest): Promise<Todo> => {
  const res = await api.post('/todos', data);
  return res.data;
};

export const updateTodo = async (id: number, data: UpdateTodoRequest): Promise<Todo> => {
  const res = await api.put(`/todos/${id}`, data);
  return res.data;
};

export const toggleTodo = async (id: number): Promise<Todo> => {
  const res = await api.patch(`/todos/${id}/toggle`);
  return res.data;
};

export const deleteTodo = async (id: number) => {
  await api.delete(`/todos/${id}`);
};
