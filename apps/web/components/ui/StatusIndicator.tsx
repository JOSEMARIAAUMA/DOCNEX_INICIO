'use client';

import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatusIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [latency, setLatency] = useState<number | null>(null);
    const [isHealthy, setIsHealthy] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Mock latency check
        const checkLatency = () => {
            const start = performance.now();
            // In a real app, you'd ping an endpoint
            setTimeout(() => {
                const end = performance.now();
                setLatency(Math.round(end - start));
                setIsHealthy(Math.round(end - start) < 500);
            }, 100);
        };

        const interval = setInterval(checkLatency, 30000);
        checkLatency();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="flex items-center gap-4 px-4 h-9 bg-card/50 border border-border rounded-full shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 border-r border-border pr-3">
                {isOnline ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-tight">
                        <Wifi className="w-3 h-3" />
                        Online
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-destructive uppercase tracking-tight animate-pulse">
                        <WifiOff className="w-3 h-3" />
                        Offline
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <Activity className={cn("w-3 h-3", isHealthy ? "text-primary" : "text-amber-500")} />
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {latency ? `${latency}ms` : '-- ms'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                        Shield Active
                    </span>
                </div>
            </div>

            {!isHealthy && isOnline && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold border-l border-border pl-3 animate-in fade-in slide-in-from-right-2">
                    <AlertTriangle className="w-3 h-3" />
                    Slow Response
                </div>
            )}
        </div>
    );
}
