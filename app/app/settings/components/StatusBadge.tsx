import { SyncStatus } from "../../clients/Dexie";

interface StatusBadgeProps {
  status: SyncStatus;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function StatusBadge({ status, count, isActive, onClick }: StatusBadgeProps) {
  const getStatusColor = (status: SyncStatus): string => {
    const baseColors = {
      [SyncStatus.Draft]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Synced]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Queued]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Failed]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.PendingDelete]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Archived]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };


    return isActive 
      ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
      : baseColors[status];
  };

  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-2 
        ${getStatusColor(status)} 
        ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'}
        ${isActive ? 'ring-1 ring-gray-400 dark:ring-gray-500' : ''}`}
    >
      {status.toUpperCase()} ({count})
    </button>
  );
} 