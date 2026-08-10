import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, Image, Trash2 } from 'lucide-react';
import { getItems } from '../api/items';
import { createLog, uploadAttachment } from '../api/logs';
import type { MaintenanceItem } from '../types';

interface AddLogModalProps {
  onClose: () => void;
  preselectedItemId?: number;
}

export default function AddLogModal({ onClose, preselectedItemId }: AddLogModalProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [itemId, setItemId] = useState<number>(preselectedItemId || 0);
  const [logDate, setLogDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [productUsed, setProductUsed] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: getItems });

  const grouped = items.reduce((acc, item) => {
    const key = item.categoryName;
    if (!acc[key]) acc[key] = { icon: item.categoryIcon, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { icon: string; items: MaintenanceItem[] }>);

  const mutation = useMutation({
    mutationFn: async () => {
      const log = await createLog({
        itemId,
        logDate: new Date(logDate).toISOString(),
        notes: notes || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        productUsed: productUsed || undefined,
      });
      for (const file of files) {
        await uploadAttachment(log.id, file);
      }
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">작업 기록 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">항목 선택 *</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(parseInt(e.target.value))}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>항목을 선택하세요</option>
              {Object.entries(grouped).map(([catName, { icon, items: catItems }]) => (
                <optgroup key={catName} label={`${icon} ${catName}`}>
                  {catItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">날짜 *</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="작업 내용, 특이사항 등..."
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">비용 ($)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">사용 제품</label>
              <input
                type="text"
                value={productUsed}
                onChange={(e) => setProductUsed(e.target.value)}
                placeholder="제품명/브랜드"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">파일 첨부</label>
            {files.length > 0 && (
              <div className="mb-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-1.5 text-sm">
                    {f.type.startsWith('image/') ? <Image size={14} className="text-blue-400 flex-shrink-0" /> : <FileText size={14} className="text-orange-400 flex-shrink-0" />}
                    <span className="text-slate-300 truncate flex-1">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 w-full bg-slate-700 border border-slate-600 border-dashed text-slate-400 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-emerald-500 hover:text-emerald-400 transition-colors">
              <Upload size={16} />
              사진 또는 파일 추가 (영수증, PDF 등)
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

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
              disabled={mutation.isPending || !itemId}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
