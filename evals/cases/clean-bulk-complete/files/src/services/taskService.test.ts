import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/taskApi', () => ({
  taskApi: { getTasks: vi.fn(), completeTask: vi.fn(), bulkComplete: vi.fn() },
}));
import { taskApi } from '@/api/taskApi';
import { taskService } from './taskService';

const dto = { id: 't1', title: 'Write report', done: false, due_date: '2026-03-01', assignee_id: null };

describe('taskService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('lists tasks with due dates parsed', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: [dto] });
    const tasks = await taskService.list(1);
    expect(tasks[0].dueDate).toEqual(new Date('2026-03-01'));
  });

  it('keeps a missing due date as null', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue({ tasks: [{ ...dto, due_date: null }] });
    expect((await taskService.list(1))[0].dueDate).toBeNull();
  });

  it('completes a task', async () => {
    vi.mocked(taskApi.completeTask).mockResolvedValue({ task: { ...dto, done: true } });
    expect((await taskService.complete('t1')).done).toBe(true);
    expect(taskApi.completeTask).toHaveBeenCalledWith('t1');
  });

  it('does not call the API to bulk complete zero tasks', async () => {
    expect(await taskService.bulkComplete([])).toBe(0);
    expect(taskApi.bulkComplete).not.toHaveBeenCalled();
  });

  it('bulk completes in a single request', async () => {
    vi.mocked(taskApi.bulkComplete).mockResolvedValue({ completed: 2 });
    expect(await taskService.bulkComplete(['t1', 't2'])).toBe(2);
    expect(taskApi.bulkComplete).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed bulk complete', async () => {
    vi.mocked(taskApi.bulkComplete).mockRejectedValue(new Error('network'));
    await expect(taskService.bulkComplete(['t1'])).rejects.toThrow('network');
  });
});
