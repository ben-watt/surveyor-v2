"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type ConnectionStatus = 'online' | 'offline' | 'poor';

export const OnlineStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [isManuallyOffline, setIsManuallyOffline] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isManuallyOffline') === 'true';
    }
    return false;
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Set initial state
    if (!isManuallyOffline) {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    }

    // Function to check connection quality
    const checkConnectionQuality = () => {
      if (isManuallyOffline) {
        setConnectionStatus('offline');
        return;
      }

      const connection = (navigator as any).connection;
      
      if (!navigator.onLine) {
        setConnectionStatus('offline');
        return;
      }

      if (connection) {
        const isLowBandwidth = connection.downlink < 1; // Less than 1 Mbps
        const isHighLatency = connection.rtt > 500; // RTT greater than 500ms
        
        if (isLowBandwidth || isHighLatency) {
          setConnectionStatus('poor');
        } else {
          setConnectionStatus('online');
        }
      }
    };

    // Add event listeners
    const handleOnline = () => {
      if (!isManuallyOffline) {
        checkConnectionQuality();
      }
    };
    
    const handleOffline = () => {
      if (!isManuallyOffline) {
        setConnectionStatus('offline');
      }
    };

    const handleConnectionChange = () => {
      if (!isManuallyOffline) {
        checkConnectionQuality();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if connection API is available
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
    }

    // Initial check
    checkConnectionQuality();

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [isManuallyOffline]);

  const getIconColor = () => {
    switch (connectionStatus) {
      case 'offline':
        return 'text-red-500';
      case 'poor':
        return 'text-orange-500';
      default:
        return '';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'offline':
        return isManuallyOffline ? 'Manually Offline' : 'Offline';
      case 'poor':
        return 'Poor Connection';
      default:
        return 'Online';
    }
  };

  const toggleOfflineMode = () => {
    const newOfflineMode = !isManuallyOffline;
    setIsManuallyOffline(newOfflineMode);
    // Persist the setting in localStorage
    localStorage.setItem('isManuallyOffline', String(newOfflineMode));
    setConnectionStatus(newOfflineMode ? 'offline' : (navigator.onLine ? 'online' : 'offline'));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
            <button className="focus:outline-none">
                {connectionStatus === 'offline' ? (
                    <WifiOff className={`h-4 w-4 ${getIconColor()}`} />
                ) : (
                    <Wifi className={`h-4 w-4 ${getIconColor()}`} />
                )}
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3">
            <div className="space-y-4">
                <p className="text-sm font-medium">{getStatusText()}</p>
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="offline-mode" className="text-sm">Offline mode</Label>
                    <Switch
                        id="offline-mode"
                        checked={isManuallyOffline}
                        onCheckedChange={toggleOfflineMode}
                    />
                </div>
            </div>
        </PopoverContent>
    </Popover>
  );
};
