'use client';

import { useBulkDeleteTasks } from '@/hooks/useTasks';
import { formatCount } from '@/lib/format';

export function BulkDeleteBar({ selectedIds }: { selectedIds: string[] }) {
  const bulkDelete = useBulkDeleteTasks();
  if (selectedIds.length === 0) return null;

  return (
    <button disabled={bulkDelete.isPending} onClick={() => bulkDelete.mutate(selectedIds)}>
      Delete {formatCount(selectedIds.length, 'task')}
    </button>
  );
}
