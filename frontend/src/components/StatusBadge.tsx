import type { MaintenanceItem } from '../types';

interface StatusBadgeProps {
  item: MaintenanceItem;
}

export default function StatusBadge({ item }: StatusBadgeProps) {
  switch (item.dueStatus) {
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">
          ⚠ {item.daysOverdue}일 초과
        </span>
      );
    case 'due-soon':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-800">
          ⏰ 곧 기한
        </span>
      );
    case 'ok':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800">
          ✓ 정상
        </span>
      );
    case 'no-logs':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600">
          — 기록 없음
        </span>
      );
  }
}
