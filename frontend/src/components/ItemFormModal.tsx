import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getCategories } from '../api/categories';
import { createItem, updateItem } from '../api/items';
import type { MaintenanceItem } from '../types';

interface ItemFormModalProps {
  item?: MaintenanceItem;
  onClose: () => void;
}

export default function ItemFormModal({ item, onClose }: ItemFormModalProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const [categoryId, setCategoryId] = useState<number>(item?.categoryId || 0);
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [intervalDays, setIntervalDays] = useState<string>(item?.intervalDays?.toString() || '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        categoryId,
        name,
        description: description || undefined,
        intervalDays: intervalDays ? parseInt(intervalDays) : undefined,
      };
      if (item) {
        return updateItem(item.id, { ...data, isActive });
      }
      return createItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !name) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">
            {item ? '항목 수정' : '새 항목 추가'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">카테고리 *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(parseInt(e.target.value))}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>카테고리 선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">항목명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="예: 에어필터 교체"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="선택사항"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">반복 주기 (일)</label>
            <input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              min="1"
              placeholder="예: 90 (비워두면 일회성)"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
            <p className="text-slate-500 text-xs mt-1">비워두면 반복 없는 일회성 작업</p>
          </div>

          {item && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <label htmlFor="isActive" className="text-slate-300 text-sm">활성 상태</label>
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-400 text-sm">오류가 발생했습니다. 다시 시도해주세요.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !categoryId || !name}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? '저장 중...' : item ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
