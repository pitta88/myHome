import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Check, List, Calendar } from 'lucide-react';
import { getTodos, toggleTodo, deleteTodo } from '../api/todos';
import { getCategories } from '../api/categories';
import type { Todo } from '../types';
import CategoryBadge from '../components/CategoryBadge';
import TodoModal from '../components/TodoModal';
import TodoCalendar from '../components/TodoCalendar';

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric'
  });
}

function isOverdue(dueDate?: string, isCompleted?: boolean) {
  if (!dueDate || isCompleted) return false;
  return dueDate < new Date().toISOString().split('T')[0];
}

export default function TodosPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [searchParams] = useSearchParams();
  const filterCategoryId = searchParams.get('category') ?? '';

  const { data: todos = [], isLoading } = useQuery({ queryKey: ['todos'], queryFn: getTodos });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const toggleMutation = useMutation({
    mutationFn: toggleTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const handleDelete = (todo: Todo) => {
    if (confirm(`"${todo.title}" 항목을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(todo.id);
    }
  };

  const filteredTodos = filterCategoryId
    ? todos.filter(t => String(t.categoryId) === filterCategoryId)
    : todos;

  const pending = filteredTodos.filter(t => !t.isCompleted);
  const completed = filteredTodos.filter(t => t.isCompleted);

  if (isLoading) {
    return <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex items-center justify-center"><div className="text-slate-400">로딩 중...</div></div>;
  }

  const renderTodo = (todo: Todo) => (
    <div
      key={todo.id}
      className={`bg-slate-800 border rounded-xl px-4 py-2.5 flex items-center gap-2 ${
        isOverdue(todo.dueDate, todo.isCompleted) ? 'border-red-800/60' : 'border-slate-700'
      }`}
    >
      <button
        onClick={() => toggleMutation.mutate(todo.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.isCompleted
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'border-slate-500 hover:border-emerald-500'
        }`}
      >
        {todo.isCompleted && <Check size={11} />}
      </button>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-0 text-sm">
        <CategoryBadge icon={todo.categoryIcon} name={todo.categoryName} color={todo.categoryColor} />
        <span className={`font-medium truncate min-w-0 lg:w-48 lg:flex-shrink-0 ${todo.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
          {todo.title}
        </span>
        {todo.description && (
          <span className="text-slate-400 truncate hidden sm:inline">{todo.description}</span>
        )}
        {todo.dueDate && (
          <span className={`text-xs flex-shrink-0 ${isOverdue(todo.dueDate, todo.isCompleted) ? 'text-red-400' : 'text-slate-500'}`}>
            📅 {formatDate(todo.dueDate)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setEditTodo(todo)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => handleDelete(todo)}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-w-0 w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">할 일</h2>
          <p className="text-slate-400 text-sm mt-1">
            {filterCategoryId
              ? `${categories.find(c => String(c.id) === filterCategoryId)?.icon ?? ''} ${categories.find(c => String(c.id) === filterCategoryId)?.name ?? ''}`
              : '모든 카테고리'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={15} />
              목록
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'calendar' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar size={15} />
              캘린더
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            <Plus size={16} />
            추가
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-6">
          <TodoCalendar
            todos={filteredTodos}
            onEdit={setEditTodo}
          />
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-slate-400">할 일이 없습니다.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            첫 번째 할 일 추가
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                남은 할 일 ({pending.length})
              </p>
              <div className="space-y-2">{pending.map(renderTodo)}</div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                완료 ({completed.length})
              </p>
              <div className="space-y-2">{completed.map(renderTodo)}</div>
            </div>
          )}
        </div>
      )}

      {showAdd && <TodoModal onClose={() => setShowAdd(false)} />}
      {editTodo && <TodoModal todo={editTodo} onClose={() => setEditTodo(null)} />}
    </div>
  );
}
