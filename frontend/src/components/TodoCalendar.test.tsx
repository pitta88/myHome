import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TodoCalendar from './TodoCalendar';
import type { Todo } from '../types';

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '잔디/정원',
    categoryIcon: '🌿',
    categoryColor: 'green',
    title: '씨뿌리기',
    description: undefined,
    dueDate: undefined,
    isCompleted: false,
    completedAt: undefined,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Todo;
}

describe('TodoCalendar', () => {
  // 달력은 '오늘'에 의존하므로 시간을 고정한다. 2026-03-15는 일요일이 아닌 중간 날짜.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('현재 연월을 제목에 보여준다', () => {
    render(<TodoCalendar todos={[]} onEdit={vi.fn()} />);

    expect(screen.getByText('2026년 3월')).toBeInTheDocument();
  });

  it('그 달의 날짜 수만큼 칸을 그린다', () => {
    render(<TodoCalendar todos={[]} onEdit={vi.fn()} />);

    // 3월은 31일까지
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.queryByText('32')).not.toBeInTheDocument();
  });

  it('이전 달로 이동하면 연월이 바뀐다', () => {
    render(<TodoCalendar todos={[]} onEdit={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('2026년 2월')).toBeInTheDocument();
  });

  it('1월에서 이전으로 가면 작년 12월이 된다', () => {
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    render(<TodoCalendar todos={[]} onEdit={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('2025년 12월')).toBeInTheDocument();
  });

  it('12월에서 다음으로 가면 내년 1월이 된다', () => {
    vi.setSystemTime(new Date('2026-12-10T12:00:00Z'));
    render(<TodoCalendar todos={[]} onEdit={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(screen.getByText('2027년 1월')).toBeInTheDocument();
  });

  it('마감일이 있는 할 일을 해당 날짜에 배치한다', () => {
    render(
      <TodoCalendar
        todos={[todo({ title: '잔디 깎기', dueDate: '2026-03-20T00:00:00Z' })]}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /잔디 깎기/ })).toBeInTheDocument();
  });

  it('마감일이 없는 할 일은 달력에 나오지 않는다', () => {
    render(<TodoCalendar todos={[todo({ title: '언젠가 할 일', dueDate: undefined })]} onEdit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /언젠가 할 일/ })).not.toBeInTheDocument();
  });

  it('한 날짜에 4개 이상이면 3개만 보이고 나머지는 개수로 접는다', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      todo({ id: i + 1, title: `할일${i + 1}`, dueDate: '2026-03-20T00:00:00Z' })
    );

    render(<TodoCalendar todos={many} onEdit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /할일3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /할일4/ })).not.toBeInTheDocument();
    expect(screen.getByText('+2개 더')).toBeInTheDocument();
  });

  it('긴 제목은 12자에서 잘라 말줄임한다', () => {
    render(
      <TodoCalendar
        todos={[todo({ title: '아주아주아주아주아주아주 긴 제목입니다', dueDate: '2026-03-20T00:00:00Z' })]}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /아주아주아주아주아주아주…/ })).toBeInTheDocument();
  });

  it('지난 날짜의 미완료 할 일은 초과로 표시한다', () => {
    render(
      <TodoCalendar
        todos={[todo({ title: '늦음', dueDate: '2026-03-10T00:00:00Z', isCompleted: false })]}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /늦음/ }).className).toMatch(/red/);
  });

  it('완료된 할 일은 지난 날짜여도 초과로 보지 않는다', () => {
    render(
      <TodoCalendar
        todos={[todo({ title: '끝남', dueDate: '2026-03-10T00:00:00Z', isCompleted: true })]}
        onEdit={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /끝남/ });
    expect(button.className).not.toMatch(/red/);
    expect(button.className).toMatch(/line-through/);
  });

  it('앞으로 남은 할 일은 초과가 아니다', () => {
    render(
      <TodoCalendar
        todos={[todo({ title: '아직', dueDate: '2026-03-25T00:00:00Z' })]}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /아직/ }).className).toMatch(/emerald/);
  });

  it('할 일을 누르면 onEdit에 그 항목을 넘긴다', () => {
    const onEdit = vi.fn();
    const target = todo({ id: 42, title: '수정 대상', dueDate: '2026-03-20T00:00:00Z' });

    render(<TodoCalendar todos={[target]} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: /수정 대상/ }));

    expect(onEdit).toHaveBeenCalledWith(target);
  });
});
