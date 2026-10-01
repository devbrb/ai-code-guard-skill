export type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate: Date | null;
  assigneeId: string | null;
};

export type User = { id: string; email: string; name: string };
