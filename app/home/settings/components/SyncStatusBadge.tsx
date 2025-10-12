import { SyncStatus } from '../../clients/Dexie';

interface SyncStatusBadgeProps {
  status: string;
  isLoading?: boolean;
}

function LoadingSpinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
  );
}

export function SyncStatusBadge({ status, isLoading }: SyncStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case SyncStatus.Draft:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case SyncStatus.Synced:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case SyncStatus.Queued:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case SyncStatus.Failed:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(status)}`}
    >
      {isLoading && <LoadingSpinner />}
      {status.toUpperCase()}
    </span>
  );
}
