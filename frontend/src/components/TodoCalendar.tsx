import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Todo } from '../types';

interface TodoCalendarProps {
  todos: Todo[];
  onEdit: (todo: Todo) => void;
}

function toDateKey(dateStr: string) {
  return dateStr.split('T')[0];
}

function isOverdue(dueDate: string, isCompleted: boolean) {
  if (isCompleted) return false;
  return dueDate < new Date().toISOString().split('T')[0];
}

export default function TodoCalendar({ todos, onEdit }: TodoCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = today.toISOString().split('T')[0];

  const todosByDate: Record<string, Todo[]> = {};
  for (const t of todos) {
    if (!t.dueDate) continue;
    const key = toDateKey(t.dueDate);
    if (!todosByDate[key]) todosByDate[key] = [];
    todosByDate[key].push(t);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-white font-semibold text-lg">{year}년 {month + 1}월</h3>
        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-700 pb-2 min-w-[900px]">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 auto-rows-[130px] gap-px bg-slate-700 border border-slate-700 rounded-lg overflow-hidden min-w-[900px] mt-2">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-slate-900/50" />;

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTodos = todosByDate[dateKey] ?? [];
          const isToday = dateKey === todayKey;
          const dayOfWeek = idx % 7;

          return (
            <div
              key={dateKey}
              className={`p-1.5 flex flex-col ${isToday ? 'bg-slate-700/80' : 'bg-slate-800'}`}
            >
              {/* Date number */}
              <span className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                isToday ? 'bg-emerald-500 text-white' :
                dayOfWeek === 0 ? 'text-red-400' :
                dayOfWeek === 6 ? 'text-blue-400' :
                'text-slate-400'
              }`}>
                {day}
              </span>

              {/* Todo items */}
              <div className="space-y-0.5 flex-1">
                {dayTodos.slice(0, 3).map(t => (
                  <button
                    key={t.id}
                    onClick={() => onEdit(t)}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate transition-colors ${
                      t.isCompleted
                        ? 'bg-slate-700 text-slate-500 line-through'
                        : isOverdue(dateKey, t.isCompleted)
                        ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                        : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                    title={t.title}
                  >
                    {t.categoryIcon} {t.title.length > 12 ? t.title.slice(0, 12) + '…' : t.title}
                  </button>
                ))}
                {dayTodos.length > 3 && (
                  <p className="text-slate-500 text-[10px] px-1">+{dayTodos.length - 3}개 더</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      </div>{/* end overflow-x-auto */}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-700 inline-block" />미완료</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-900/40 border border-red-700 inline-block" />기한 초과</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-700 inline-block" />완료</span>
      </div>
    </div>
  );
}
