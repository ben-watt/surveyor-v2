import { SyncStatus } from "../../clients/Dexie";
import { EntityType } from "../types";
import { StatusBadge } from "./StatusBadge";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { MouseEvent } from "react";

interface EntityCardProps {
  type: EntityType;
  title: string;
  count: number;
  isSelected: boolean;
  isHydrated: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  statusCounts: Record<SyncStatus, number>;
  selectedStatus?: SyncStatus;
  onCardClick: () => void;
  onStatusClick: (status: SyncStatus) => void;
}

export function EntityCard({
  type,
  title,
  count,
  isSelected,
  isHydrated,
  isSyncing,
  isLoading,
  statusCounts,
  selectedStatus,
  onCardClick,
  onStatusClick,
}: EntityCardProps) {
  return (
    <div 
      className={`p-4 border rounded-lg transition-colors cursor-pointer
        ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
      `}
      onClick={onCardClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <SyncStatusBadge 
            status={isHydrated ? SyncStatus.Synced : "loading"} 
            isLoading={isSyncing || isLoading}
          />
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Count: {count}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.values(SyncStatus).map((status) => (
          <StatusBadge
            key={status}
            status={status}
            count={statusCounts[status]}
            isActive={selectedStatus === status}
            onClick={() => {
              onStatusClick(status);
            }}
          />
        ))}
      </div>
    </div>
  );
} 