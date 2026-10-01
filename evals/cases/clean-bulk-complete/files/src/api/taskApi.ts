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
  bulkComplete: (ids: string[]) => apiClient.post<{ completed: number }>('/tasks/bulk-complete', { ids }),
};
