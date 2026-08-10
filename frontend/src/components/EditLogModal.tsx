import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, Image, Trash2, ExternalLink } from 'lucide-react';
import { updateLog, uploadAttachment, deleteAttachment } from '../api/logs';
import type { MaintenanceLog, LogAttachment } from '../types';

interface EditLogModalProps {
  log: MaintenanceLog;
  onClose: () => void;
}

const BASE_URL = '';

export default function EditLogModal({ log, onClose }: EditLogModalProps) {
  const queryClient = useQueryClient();
  const [logDate, setLogDate] = useState(log.logDate.split('T')[0]);
  const [notes, setNotes] = useState(log.notes || '');
  const [cost, setCost] = useState(log.cost?.toString() || '');
  const [productUsed, setProductUsed] = useState(log.productUsed || '');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const existingAttachments = log.attachments.filter(a => !deletedAttachmentIds.includes(a.id));

  const mutation = useMutation({
    mutationFn: async () => {
      await updateLog(log.id, {
        logDate: new Date(logDate).toISOString(),
        notes: notes || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        productUsed: productUsed || undefined,
      });
      for (const id of deletedAttachmentIds) {
        await deleteAttachment(log.id, id);
      }
      for (const file of newFiles) {
        await uploadAttachment(log.id, file);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setNewFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeExisting = (att: LogAttachment) => {
    setDeletedAttachmentIds(prev => [...prev, att.id]);
  };

  const removeNew = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-white font-semibold text-lg">기록 수정</h2>
            <p className="text-slate-400 text-sm mt-0.5">{log.itemName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
            <label className="block text-slate-300 text-sm font-medium mb-2">첨부 파일</label>

            {/* Existing attachments */}
            {existingAttachments.length > 0 && (
              <div className="mb-2 space-y-1">
                {existingAttachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-1.5 text-sm">
                    {att.isImage
                      ? <Image size={14} className="text-blue-400 flex-shrink-0" />
                      : <FileText size={14} className="text-orange-400 flex-shrink-0" />
                    }
                    <span className="text-slate-300 truncate flex-1">{att.fileName}</span>
                    {att.isImage ? (
                      <button type="button" onClick={() => setPreviewUrl(`${BASE_URL}${att.filePath}`)}
                        className="text-slate-500 hover:text-blue-400 flex-shrink-0">
                        <Image size={13} />
                      </button>
                    ) : (
                      <a href={`${BASE_URL}${att.filePath}`} target="_blank" rel="noreferrer"
                        className="text-slate-500 hover:text-blue-400 flex-shrink-0">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button type="button" onClick={() => removeExisting(att)}
                      className="text-slate-500 hover:text-red-400 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New files to upload */}
            {newFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-700/50 border border-dashed border-slate-600 rounded-lg px-3 py-1.5 text-sm">
                    {f.type.startsWith('image/') ? <Image size={14} className="text-blue-400 flex-shrink-0" /> : <FileText size={14} className="text-orange-400 flex-shrink-0" />}
                    <span className="text-slate-400 truncate flex-1">{f.name}</span>
                    <span className="text-slate-600 text-xs flex-shrink-0">새 파일</span>
                    <button type="button" onClick={() => removeNew(i)}
                      className="text-slate-500 hover:text-red-400 flex-shrink-0">
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
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? '저장 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>

      {/* Image preview */}
      {previewUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="첨부 사진" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
