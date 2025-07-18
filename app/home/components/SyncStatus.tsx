"use client";

import { useEffect, useState, useMemo } from 'react';
import { Cloud, CloudOff, RefreshCw, RotateCcw } from 'lucide-react';
import { surveyStore, componentStore, elementStore, phraseStore, sectionStore } from '../clients/Database';
import { SyncStatus as SyncStatusEnum } from '../clients/Dexie';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export const SyncStatus = () => {
    const [surveysHydrated, surveys] = surveyStore.useRawList();
    const [componentsHydrated, components] = componentStore.useList();
    const [elementsHydrated, elements] = elementStore.useList();
    const [phrasesHydrated, phrases] = phraseStore.useList();
    const [sectionsHydrated, sections] = sectionStore.useList();

    const [isSyncing, setIsSyncing] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isForceSyncing, setIsForceSyncing] = useState(false);

    // Check if any items are not synced
    const hasUnsynced = [
        ...surveys,
        ...components,
        ...elements,
        ...phrases,
        ...sections
    ].some(item => 
        item.syncStatus === SyncStatusEnum.Draft || 
        item.syncStatus === SyncStatusEnum.Queued ||
        item.syncStatus === SyncStatusEnum.Failed ||
        item.syncStatus === SyncStatusEnum.PendingDelete ||
        item.syncStatus === SyncStatusEnum.Archived
    );

    // Count items by sync status
    const statusCounts = useMemo(() => {
        const counts = {
            [SyncStatusEnum.Draft]: 0,
            [SyncStatusEnum.Queued]: 0,
            [SyncStatusEnum.Failed]: 0,
            [SyncStatusEnum.Synced]: 0,
            [SyncStatusEnum.PendingDelete]: 0,
            [SyncStatusEnum.Archived]: 0,
        };

        [
            ...surveys,
            ...components,
            ...elements,
            ...phrases,
            ...sections
        ].forEach(item => {
            counts[item.syncStatus as SyncStatusEnum]++;
        });

        return counts;
    }, [surveys, components, elements, phrases, sections]);

    // Monitor sync status changes
    useEffect(() => {
        const syncInterval = setInterval(() => {
            setIsSyncing(
                statusCounts[SyncStatusEnum.Queued] > 0 ||
                statusCounts[SyncStatusEnum.Draft] > 0 ||
                statusCounts[SyncStatusEnum.PendingDelete] > 0 ||
                statusCounts[SyncStatusEnum.Archived] > 0
            );
        }, 1000);

        return () => clearInterval(syncInterval);
    }, [statusCounts]);

    const handleForceSync = async () => {
        setIsForceSyncing(true);
        try {
            // Force sync all stores
            const results = await Promise.all([
                surveyStore.forceSync(),
                componentStore.forceSync(),
                elementStore.forceSync(),
                phraseStore.forceSync(),
                sectionStore.forceSync(),
            ]);

            const hasErrors = results.some(result => result && !result.ok);
            if (hasErrors) {
                toast.error("Some items failed to sync");
            } else {
                toast.success("Force sync completed");
            }
        } catch (error) {
            console.error("Force sync error:", error);
            toast.error("Force sync failed");
        } finally {
            setIsForceSyncing(false);
        }
    };

    // Don't show anything until all data is hydrated
    if (!surveysHydrated || !componentsHydrated || !elementsHydrated || 
        !phrasesHydrated || !sectionsHydrated) {
        return null;
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="focus:outline-none">
                    <div className="flex items-center gap-2 text-sm">
                        {isSyncing ? (
                            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : hasUnsynced ? (
                            <CloudOff className="h-4 w-4 text-yellow-500" />
                        ) : (
                            <Cloud className="h-4 w-4" />
                        )}
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
                <div className="space-y-3">
                    <p className="text-sm font-medium">
                        {isSyncing ? "Syncing in progress..." : 
                         hasUnsynced ? "Unsynced Changes" : 
                         "All Changes Synced"}
                    </p>
                    {hasUnsynced && (
                        <div className="space-y-1">
                            {Object.entries(statusCounts)
                                .filter(([status, count]) => count > 0 && status !== SyncStatusEnum.Synced)
                                .map(([status, count]) => (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{status}</span>
                                        <span>{count}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                    {hasUnsynced && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleForceSync}
                            disabled={isForceSyncing}
                            className="w-full"
                        >
                            {isForceSyncing ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                            ) : (
                                <RotateCcw className="h-3 w-3 mr-2" />
                            )}
                            Force Sync
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}; 