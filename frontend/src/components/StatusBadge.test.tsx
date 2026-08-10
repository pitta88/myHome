import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';
import CategoryBadge from './CategoryBadge';
import type { MaintenanceItem } from '../types';

/** dueStatus 외 필드는 표시에 쓰이지 않으므로 최소한만 채운다. */
function item(overrides: Partial<MaintenanceItem>): MaintenanceItem {
  return {
    id: 1,
    categoryId: 1,
    categoryName: '잔디/정원',
    categoryIcon: '🌿',
    categoryColor: 'green',
    name: '잔디 깍기',
    description: null,
    intervalDays: 30,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastLogDate: null,
    nextDueDate: null,
    daysOverdue: null,
    dueStatus: 'no-logs',
    ...overrides,
  } as MaintenanceItem;
}

describe('StatusBadge', () => {
  // 백엔드 ItemsController가 내려주는 네 가지 dueStatus 값과 1:1로 대응한다
  it('overdue면 초과 일수를 함께 보여준다', () => {
    render(<StatusBadge item={item({ dueStatus: 'overdue', daysOverdue: 15 })} />);

    expect(screen.getByText(/15일 초과/)).toBeInTheDocument();
  });

  it('due-soon이면 곧 기한으로 표시한다', () => {
    render(<StatusBadge item={item({ dueStatus: 'due-soon' })} />);

    expect(screen.getByText(/곧 기한/)).toBeInTheDocument();
  });

  it('ok면 정상으로 표시한다', () => {
    render(<StatusBadge item={item({ dueStatus: 'ok' })} />);

    expect(screen.getByText(/정상/)).toBeInTheDocument();
  });

  it('no-logs면 기록 없음으로 표시한다', () => {
    render(<StatusBadge item={item({ dueStatus: 'no-logs' })} />);

    expect(screen.getByText(/기록 없음/)).toBeInTheDocument();
  });

  it('모르는 값이 와도 기록 없음으로 떨어진다', () => {
    render(<StatusBadge item={item({ dueStatus: 'something-new' as never })} />);

    expect(screen.getByText(/기록 없음/)).toBeInTheDocument();
  });

  it('overdue 배지는 빨간 계열로 구분된다', () => {
    render(<StatusBadge item={item({ dueStatus: 'overdue', daysOverdue: 3 })} />);

    expect(screen.getByText(/3일 초과/).className).toMatch(/red/);
  });
});

describe('CategoryBadge', () => {
  it('아이콘과 이름을 함께 보여준다', () => {
    render(<CategoryBadge icon="🚗" name="자동차" color="blue" />);

    expect(screen.getByText(/🚗 자동차/)).toBeInTheDocument();
  });

  it.each([
    ['green', /green/],
    ['blue', /blue/],
    ['orange', /orange/],
  ])('색상 %s는 해당 팔레트를 쓴다', (color, expected) => {
    render(<CategoryBadge icon="🔧" name="테스트" color={color} />);

    expect(screen.getByText(/테스트/).className).toMatch(expected);
  });

  it('모르는 색상은 회색으로 떨어진다', () => {
    // 사용자가 카테고리를 새로 만들며 임의 색을 넣어도 깨지지 않아야 한다
    render(<CategoryBadge icon="🧹" name="지하실" color="chartreuse" />);

    expect(screen.getByText(/지하실/).className).toMatch(/slate/);
  });
});
