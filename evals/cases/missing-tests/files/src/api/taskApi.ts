import { apiClient } from './client';

export type TaskDto = {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  assignee_id: string | null;
};

export const taskApi = {
  getTasks: (page: number) => apiClient.get<{ tasks: TaskDto[] }>(`/tasks?page=${page}`),
  completeTask: (id: string) => apiClient.post<{ task: TaskDto }>(`/tasks/${id}/complete`),
  bulkDelete: (ids: string[]) => apiClient.post<{ deleted: number }>('/tasks/bulk-delete', { ids }),
};
