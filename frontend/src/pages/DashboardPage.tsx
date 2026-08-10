import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, CheckCircle2, List, Plus } from 'lucide-react';
import { getDashboard } from '../api/dashboard';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import AddLogModal from '../components/AddLogModal';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export default function DashboardPage() {
  const [showAddLog, setShowAddLog] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-red-400">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const summaryCards = [
    { label: '전체 항목 수', value: data.totalItems, icon: List, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: '기한 초과', value: data.overdueCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/30' },
    { label: '곧 기한 (7일 내)', value: data.dueSoonCount, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    { label: '이번달 완료', value: data.thisMonthCompleted, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  ];

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">대시보드</h2>
          <p className="text-slate-400 text-sm mt-1">홈 관리 현황 개요</p>
        </div>
        <button
          onClick={() => setShowAddLog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Plus size={16} />
          작업 기록
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
            <div className="text-slate-400 text-sm">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Items */}
        {data.overdueItems.length > 0 && (
          <div className="bg-slate-800 border border-red-900/50 rounded-xl p-5">
            <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={16} />
              기한 초과 항목 ({data.overdueItems.length})
            </h3>
            <div className="space-y-3">
              {data.overdueItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-900/40 rounded-lg">
                  <div>
                    <div className="text-white text-sm font-medium">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge icon={item.categoryIcon} name={item.categoryName} color={item.categoryColor} />
                    </div>
                  </div>
                  <StatusBadge item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due Soon Items */}
        {data.dueSoonItems.length > 0 && (
          <div className="bg-slate-800 border border-yellow-900/50 rounded-xl p-5">
            <h3 className="text-yellow-400 font-semibold mb-4 flex items-center gap-2">
              <Clock size={16} />
              곧 기한 항목 ({data.dueSoonItems.length})
            </h3>
            <div className="space-y-3">
              {data.dueSoonItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-900/40 rounded-lg">
                  <div>
                    <div className="text-white text-sm font-medium">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge icon={item.categoryIcon} name={item.categoryName} color={item.categoryColor} />
                      {item.nextDueDate && (
                        <span className="text-slate-400 text-xs">기한: {formatDate(item.nextDueDate)}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 ${data.overdueItems.length === 0 && data.dueSoonItems.length === 0 ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            최근 작업 기록
          </h3>
          {data.recentLogs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">기록된 작업이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {data.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium truncate">{log.itemName}</span>
                      <CategoryBadge icon={log.categoryIcon} name={log.categoryName} color={log.categoryColor} />
                    </div>
                    {log.notes && <p className="text-slate-400 text-xs truncate">{log.notes}</p>}
                    {log.productUsed && <p className="text-slate-500 text-xs">제품: {log.productUsed}</p>}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-slate-300 text-xs">{formatDate(log.logDate)}</div>
                    {log.cost != null && (
                      <div className="text-emerald-400 text-xs font-medium">${log.cost.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddLog && <AddLogModal onClose={() => setShowAddLog(false)} />}
    </div>
  );
}
