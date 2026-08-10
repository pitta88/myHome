export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface MaintenanceItem {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  name: string;
  description?: string;
  intervalDays?: number;
  isActive: boolean;
  createdAt: string;
  lastLogDate?: string;
  nextDueDate?: string;
  daysOverdue?: number;
  dueStatus: 'overdue' | 'due-soon' | 'ok' | 'no-logs';
}

export interface LogAttachment {
  id: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  isImage: boolean;
}

export interface MaintenanceLog {
  id: number;
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  logDate: string;
  notes?: string;
  cost?: number;
  productUsed?: string;
  photoPath?: string;
  attachments: LogAttachment[];
  createdAt: string;
}

export interface Dashboard {
  totalItems: number;
  overdueCount: number;
  dueSoonCount: number;
  thisMonthCompleted: number;
  recentLogs: MaintenanceLog[];
  overdueItems: MaintenanceItem[];
  dueSoonItems: MaintenanceItem[];
}

export interface CreateItemRequest {
  categoryId: number;
  name: string;
  description?: string;
  intervalDays?: number;
}

export interface UpdateItemRequest {
  categoryId: number;
  name: string;
  description?: string;
  intervalDays?: number;
  isActive: boolean;
}

export interface Todo {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface CreateTodoRequest {
  categoryId: number;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateTodoRequest {
  categoryId: number;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface CreateLogRequest {
  itemId: number;
  logDate: string;
  notes?: string;
  cost?: number;
  productUsed?: string;
}

export interface UpdateLogRequest {
  logDate: string;
  notes?: string;
  cost?: number;
  productUsed?: string;
}
