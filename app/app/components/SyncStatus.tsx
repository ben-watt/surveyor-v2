"use client";

import { useEffect, useState, useMemo } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { surveyStore, componentStore, elementStore, phraseStore, locationStore, sectionStore } from '../clients/Database';
import { SyncStatus as SyncStatusEnum } from '../clients/Dexie';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const SyncStatus = () => {
    const [surveysHydrated, surveys] = surveyStore.useRawList();
    const [componentsHydrated, components] = componentStore.useList();
    const [elementsHydrated, elements] = elementStore.useList();
    const [phrasesHydrated, phrases] = phraseStore.useList();
    const [locationsHydrated, locations] = locationStore.useList();
    const [sectionsHydrated, sections] = sectionStore.useList();

    const [isSyncing, setIsSyncing] = useState(false);

    // Check if any items are not synced
    const hasUnsynced = [
        ...surveys,
        ...components,
        ...elements,
        ...phrases,
        ...locations,
        ...sections
    ].some(item => 
        item.syncStatus === SyncStatusEnum.Draft || 
        item.syncStatus === SyncStatusEnum.Queued ||
        item.syncStatus === SyncStatusEnum.Failed ||
        item.syncStatus === SyncStatusEnum.PendingDelete
    );

    // Count items by sync status
    const statusCounts = useMemo(() => {
        const counts = {
            [SyncStatusEnum.Draft]: 0,
            [SyncStatusEnum.Queued]: 0,
            [SyncStatusEnum.Failed]: 0,
            [SyncStatusEnum.Synced]: 0,
            [SyncStatusEnum.PendingDelete]: 0,
        };

        [
            ...surveys,
            ...components,
            ...elements,
            ...phrases,
            ...locations,
            ...sections
        ].forEach(item => {
            counts[item.syncStatus as SyncStatusEnum]++;
        });

        return counts;
    }, [surveys, components, elements, phrases, locations, sections]);

    // Monitor sync status changes
    useEffect(() => {
        const syncInterval = setInterval(() => {
            setIsSyncing(
                statusCounts[SyncStatusEnum.Queued] > 0 ||
                statusCounts[SyncStatusEnum.Draft] > 0 ||
                statusCounts[SyncStatusEnum.PendingDelete] > 0
            );
        }, 1000);

        return () => clearInterval(syncInterval);
    }, [statusCounts]);

    // Don't show anything until all data is hydrated
    if (!surveysHydrated || !componentsHydrated || !elementsHydrated || 
        !phrasesHydrated || !locationsHydrated || !sectionsHydrated) {
        return null;
    }

    const getTooltipContent = () => {
        if (isSyncing) {
            return "Syncing in progress...";
        }
        if (hasUnsynced) {
            return `Unsynced changes:\n${
                Object.entries(statusCounts)
                    .filter(([status, count]) => count > 0 && status !== SyncStatusEnum.Synced)
                    .map(([status, count]) => `${status}: ${count}`)
                    .join('\n')
            }`;
        }
        return "All changes synced";
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex items-center gap-2 text-sm">
                        {isSyncing ? (
                            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : hasUnsynced ? (
                            <CloudOff className="h-4 w-4 text-yellow-500" />
                        ) : (
                            <Cloud className="h-4 w-4 text-green-500" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-pre-line">{getTooltipContent()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}; 