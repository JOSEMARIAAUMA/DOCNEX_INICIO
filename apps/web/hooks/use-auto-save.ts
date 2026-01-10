
import { useEffect, useRef, useState } from 'react';

export function useDebouncedSave<T>(
    value: T,
    onSave: (val: T) => Promise<any>,
    delay = 1000,
    maxRetries = 3
) {
    const [status, setStatus] = useState<'saved' | 'saving' | 'modified' | 'error' | 'retrying'>('saved');
    const [retryCount, setRetryCount] = useState(0);
    const lastSavedRef = useRef<T>(value);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const performSave = async (val: T, attempt: number = 0) => {
        setStatus(attempt > 0 ? 'retrying' : 'saving');
        try {
            await onSave(val);
            lastSavedRef.current = val;
            setStatus('saved');
            setRetryCount(0);
        } catch (e) {
            console.error(`Save attempt ${attempt + 1} failed:`, e);
            if (attempt < maxRetries) {
                const nextAttempt = attempt + 1;
                setRetryCount(nextAttempt);
                // Exponential backoff: 2s, 4s, 8s...
                const backoffDelay = Math.pow(2, nextAttempt) * 1000;
                timerRef.current = setTimeout(() => performSave(val, nextAttempt), backoffDelay);
            } else {
                setStatus('error');
            }
        }
    };

    useEffect(() => {
        // If value has not changed relative to what was last saved, ignore
        if (value === lastSavedRef.current) {
            return;
        }

        setStatus('modified');

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            performSave(value);
        }, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [value, onSave, delay]);

    return { status, retryCount };
}
