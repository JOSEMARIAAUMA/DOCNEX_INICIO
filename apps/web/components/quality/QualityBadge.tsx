import React from 'react';
import { Award, Star, Medal, Trophy } from 'lucide-react';
import { Document } from '@/lib/api';
import { cn } from '@/lib/utils';
import { QualityMetrics, QUALITY_THRESHOLDS } from '@/lib/ai/quality-scorer';

interface QualityBadgeProps {
    score: number;
    level?: QualityMetrics['level'];
    className?: string;
    showScore?: boolean;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
    score,
    level: mapLevel,
    className,
    showScore = false,
}) => {
    // Determine level if not provided
    let level = mapLevel;
    if (!level) {
        if (score >= QUALITY_THRESHOLDS.PLATINUM) level = 'platinum';
        else if (score >= QUALITY_THRESHOLDS.GOLD) level = 'gold';
        else if (score >= QUALITY_THRESHOLDS.SILVER) level = 'silver';
        else level = 'bronze';
    }

    const getBadgeConfig = (lvl: string) => {
        switch (lvl) {
            case 'platinum':
                return {
                    icon: Trophy,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
                    border: 'border-indigo-200 dark:border-indigo-800',
                    label: 'Platinum',
                };
            case 'gold':
                return {
                    icon: Medal,
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Gold',
                };
            case 'silver':
                return {
                    icon: Award,
                    color: 'text-slate-500',
                    bg: 'bg-slate-100 dark:bg-slate-800',
                    border: 'border-slate-200 dark:border-slate-700',
                    label: 'Silver',
                };
            default:
                return {
                    icon: Star,
                    color: 'text-amber-700',
                    bg: 'bg-amber-100 dark:bg-amber-900/30',
                    border: 'border-amber-200 dark:border-amber-800',
                    label: 'Bronze',
                };
        }
    };

    const config = getBadgeConfig(level);
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-colors',
                config.bg,
                config.color,
                config.border,
                className
            )}
            title={`Quality Score: ${score}/100 (${config.label})`}
        >
            <Icon className="w-3.5 h-3.5" />
            {showScore && <span>{score}</span>}
        </div>
    );
};
