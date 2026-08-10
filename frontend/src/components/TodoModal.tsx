import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getCategories } from '../api/categories';
import { createTodo, updateTodo } from '../api/todos';
import type { Todo } from '../types';

interface TodoModalProps {
  todo?: Todo;
  onClose: () => void;
}

export default function TodoModal({ todo, onClose }: TodoModalProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const [categoryId, setCategoryId] = useState<number>(todo?.categoryId ?? 0);
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [dueDate, setDueDate] = useState(todo?.dueDate ? todo.dueDate.split('T')[0] : '');

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        categoryId,
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      };
      return todo ? updateTodo(todo.id, data) : createTodo(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !title.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-white font-semibold">{todo ? '할 일 수정' : '할 일 추가'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">카테고리 *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value={0}>카테고리 선택</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="상세 내용 (선택)"
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">기한</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
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
              {mutation.isPending ? '저장 중...' : (todo ? '수정' : '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
