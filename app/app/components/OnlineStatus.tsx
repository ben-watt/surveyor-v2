'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const OnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        // Add event listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
                <>
                    <Wifi className="h-4 w-4 text-green-500" />
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                </>
            )}
        </div>
    );
}; 