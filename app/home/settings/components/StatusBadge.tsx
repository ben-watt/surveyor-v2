import { SyncStatus } from '../../clients/Dexie';

interface StatusBadgeProps {
  status: SyncStatus;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function StatusBadge({ status, count, isActive, onClick }: StatusBadgeProps) {
  const getStatusColor = (status: SyncStatus): string => {
    const baseColors = {
      [SyncStatus.Draft]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [SyncStatus.Synced]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [SyncStatus.Queued]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [SyncStatus.Failed]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [SyncStatus.PendingDelete]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      [SyncStatus.Archived]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };

    return isActive
      ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
      : baseColors[status];
  };

  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(status)} ${count === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'} ${isActive ? 'ring-1 ring-gray-400 dark:ring-gray-500' : ''}`}
    >
      {status.toUpperCase()} ({count})
    </button>
  );
}
