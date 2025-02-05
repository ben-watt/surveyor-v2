"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { TooltipContent, Tooltip, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                {isOnline ? (
                    <Wifi className="h-4 w-4" />
                ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                )}
            </TooltipTrigger>
            <TooltipContent>
                <p>{isOnline ? "Online" : "Offline"}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
};
