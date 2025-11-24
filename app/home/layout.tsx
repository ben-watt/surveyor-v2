'use client';

import { Toaster } from 'react-hot-toast';
import { Suspense, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DynamicDrawerProvider } from './components/Drawer';
import Error from './error';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { syncCoordinator } from './clients/SyncCoordinator';
import { enhancedImageStore } from './clients/enhancedImageMetadataStore';
import { OnlineStatus } from './components/OnlineStatus';
import { SyncStatus } from './components/SyncStatus';
import { TenantProvider } from './utils/TenantContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Trigger initial sync on app load after a short delay to ensure auth is ready
    const triggerInitialSync = async () => {
      if (navigator.onLine) {
        console.log('[Layout] Triggering initial sync via SyncCoordinator');
        await syncCoordinator.syncAll();
        await syncCoordinator.syncImageUploads();
      }
    };

    const initialSyncTimeout = setTimeout(triggerInitialSync, 1000);

    // Initialize SyncCoordinator with periodic sync (5 minutes) and network handlers
    const cleanupSync = syncCoordinator.initialize(300000);

    // Periodic thumbnail cleanup (once a day)
    const cleanupThumbsInterval = setInterval(
      () => {
        enhancedImageStore.cleanupOldThumbnails(100);
      },
      24 * 60 * 60 * 1000,
    );

    return () => {
      clearTimeout(initialSyncTimeout);
      cleanupSync();
      clearInterval(cleanupThumbsInterval);
    };
  }, []);

  return (
    <DynamicDrawerProvider>
      <TooltipProvider>
        <TenantProvider>
          <SidebarProvider>
            <AppSidebar className="print:!hidden z-[200]" />
            <SidebarInset className="print:!m-0 print:!w-0 print:!p-0">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 print:!hidden">
                <div className="flex w-full items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Breadcrumbs />
                </div>
                <div className="mr-10 flex items-center gap-4">
                  <SyncStatus />
                  <OnlineStatus />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4">
                <ErrorBoundary
                  fallbackRender={(props) => (
                    <Error error={props.error} reset={props.resetErrorBoundary} />
                  )}
                >
                  <Suspense fallback={<div>Loading...</div>}>
                    <div>{children}</div>
                  </Suspense>
                </ErrorBoundary>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </TenantProvider>
        <Toaster position="top-right" />
      </TooltipProvider>
    </DynamicDrawerProvider>
  );
}
