'use client';

import { useBulkCompleteTasks } from '@/hooks/useTasks';
import { formatCount } from '@/lib/format';

export function BulkCompleteBar({ selectedIds }: { selectedIds: string[] }) {
  const bulkComplete = useBulkCompleteTasks();
  if (selectedIds.length === 0) return null;

  return (
    <button disabled={bulkComplete.isPending} onClick={() => bulkComplete.mutate(selectedIds)}>
      Complete {formatCount(selectedIds.length, 'task')}
    </button>
  );
}
