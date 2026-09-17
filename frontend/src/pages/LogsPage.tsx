import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Image, FileText } from 'lucide-react';
import { getLogs, deleteLog } from '../api/logs';
import { getCategories } from '../api/categories';
import type { MaintenanceLog } from '../types';
import CategoryBadge from '../components/CategoryBadge';
import AddLogModal from '../components/AddLogModal';
import EditLogModal from '../components/EditLogModal';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export default function LogsPage() {
  const queryClient = useQueryClient();
  const [showAddLog, setShowAddLog] = useState(false);
  const [editLog, setEditLog] = useState<MaintenanceLog | null>(null);
  const [searchParams] = useSearchParams();
  const filterCategoryId = searchParams.get('category') ?? '';
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['logs'], queryFn: () => getLogs() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const deleteMutation = useMutation({
    mutationFn: deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const handleDelete = (log: MaintenanceLog) => {
    if (confirm(`"${log.itemName}" 기록을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(log.id);
    }
  };

  const filteredLogs = filterCategoryId
    ? logs.filter(l => String(l.categoryId) === filterCategoryId)
    : logs;

  if (isLoading) {
    return <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex items-center justify-center"><div className="text-slate-400">로딩 중...</div></div>;
  }

  return (
    <div className="flex-1 min-w-0 w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">작업 기록</h2>
          <p className="text-slate-400 text-sm mt-1">
            {filterCategoryId
              ? `${categories.find(c => String(c.id) === filterCategoryId)?.icon ?? ''} ${categories.find(c => String(c.id) === filterCategoryId)?.name ?? ''}`
              : '모든 카테고리'}
          </p>
        </div>
        <button
          onClick={() => setShowAddLog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus size={16} />
          기록 추가
        </button>
      </div>


      {filteredLogs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-slate-400">기록된 작업이 없습니다.</p>
          <button
            onClick={() => setShowAddLog(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            첫 번째 기록 추가
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, index) => {
            const prevLog = filteredLogs[index - 1];
            const showDateHeader = !prevLog || formatDate(log.logDate) !== formatDate(prevLog.logDate);

            return (
              <div key={log.id}>
                {showDateHeader && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-slate-700" />
                    <span className="text-slate-500 text-xs font-medium">{formatDate(log.logDate)}</span>
                    <div className="h-px flex-1 bg-slate-700" />
                  </div>
                )}
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-0 text-sm">
                    <CategoryBadge icon={log.categoryIcon} name={log.categoryName} color={log.categoryColor} />
                    <span className="text-white font-medium truncate min-w-0 lg:w-36 lg:flex-shrink-0">{log.itemName}</span>
                    {log.notes && <span className="text-slate-400 truncate hidden sm:inline">{log.notes}</span>}
                    {log.productUsed && <span className="text-slate-500 text-xs flex-shrink-0">🏷 {log.productUsed}</span>}
                    {log.cost != null && <span className="text-emerald-400 text-xs font-medium flex-shrink-0">💰 ${log.cost.toFixed(2)}</span>}
                    {log.photoPath && (
                      <button
                        onClick={() => setPhotoPreview(`${log.photoPath}`)}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs flex-shrink-0"
                      >
                        <Image size={12} />
                        사진
                      </button>
                    )}
                    {log.attachments?.map(att => att.isImage ? (
                      <button key={att.id}
                        onClick={() => setPhotoPreview(`${att.filePath}`)}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs flex-shrink-0"
                      >
                        <Image size={12} />
                        사진
                      </button>
                    ) : (
                      <a key={att.id}
                        href={`${att.filePath}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors text-xs flex-shrink-0"
                      >
                        <FileText size={12} />
                        파일
                      </a>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => setEditLog(log)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(log)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddLog && <AddLogModal onClose={() => setShowAddLog(false)} />}
      {editLog && <EditLogModal log={editLog} onClose={() => setEditLog(null)} />}

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPhotoPreview(null)}
        >
          <img src={photoPreview} alt="작업 사진" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
