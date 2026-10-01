import { taskApi, type TaskDto } from '@/api/taskApi';
import type { Task } from '@/types';

function toTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    done: dto.done,
    dueDate: dto.due_date ? new Date(dto.due_date) : null,
    assigneeId: dto.assignee_id,
  };
}

export const taskService = {
  async list(page: number): Promise<Task[]> {
    const { tasks } = await taskApi.getTasks(page);
    return tasks.map(toTask);
  },

  async complete(id: string): Promise<Task> {
    const { task } = await taskApi.completeTask(id);
    return toTask(task);
  },
};
