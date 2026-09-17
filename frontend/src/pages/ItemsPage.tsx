import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getItems, deleteItem } from '../api/items';
import type { MaintenanceItem } from '../types';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import ItemFormModal from '../components/ItemFormModal';
import AddLogModal from '../components/AddLogModal';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export default function ItemsPage() {
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<MaintenanceItem | null>(null);
  const [logForItem, setLogForItem] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: getItems });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const handleDelete = (item: MaintenanceItem) => {
    if (confirm(`"${item.name}" 항목을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const key = item.categoryName;
    if (!acc[key]) acc[key] = { icon: item.categoryIcon, color: item.categoryColor, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { icon: string; color: string; items: MaintenanceItem[] }>);

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  if (isLoading) {
    return <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex items-center justify-center"><div className="text-slate-400">로딩 중...</div></div>;
  }

  return (
    <div className="flex-1 min-w-0 w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">관리 항목</h2>
          <p className="text-slate-400 text-sm mt-1">유지보수 항목 관리</p>
        </div>
        <button
          onClick={() => setShowAddItem(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus size={16} />
          항목 추가
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-slate-400">관리 항목이 없습니다.</p>
          <button
            onClick={() => setShowAddItem(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            첫 번째 항목 추가
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([catName, { icon, color, items: catItems }]) => {
            const isExpanded = expandedCategories.has(catName);
            const overdueCount = catItems.filter(i => i.dueStatus === 'overdue').length;

            return (
              <div key={catName} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CategoryBadge icon={icon} name={catName} color={color} />
                    <span className="text-slate-400 text-sm">{catItems.length}개 항목</span>
                    {overdueCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-900/50 text-red-400 border border-red-800 rounded-full text-xs">
                        {overdueCount}개 초과
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                    {catItems.map((item) => (
                      <div key={item.id} className={`px-4 py-2.5 flex items-center justify-between ${item.dueStatus === 'overdue' ? 'bg-red-900/10' : ''}`}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-0 text-sm">
                          <span className="text-white font-medium truncate">{item.name}</span>
                          {!item.isActive && (
                            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-500 rounded-full text-xs flex-shrink-0">비활성</span>
                          )}
                          <StatusBadge item={item} />
                          {item.intervalDays && <span className="text-slate-500 text-xs flex-shrink-0">주기 {item.intervalDays}일</span>}
                          <span className="text-slate-500 text-xs flex-shrink-0">최근 {formatDate(item.lastLogDate)}</span>
                          {item.nextDueDate && <span className="text-slate-500 text-xs flex-shrink-0">기한 {formatDate(item.nextDueDate)}</span>}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2 ml-4">
                          <button
                            onClick={() => setLogForItem(item.id)}
                            className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-800 rounded-lg text-xs hover:bg-emerald-600/30 transition-colors"
                          >
                            + 기록
                          </button>
                          <button
                            onClick={() => setEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddItem && <ItemFormModal onClose={() => setShowAddItem(false)} />}
      {editItem && <ItemFormModal item={editItem} onClose={() => setEditItem(null)} />}
      {logForItem && <AddLogModal preselectedItemId={logForItem} onClose={() => setLogForItem(null)} />}
    </div>
  );
}
