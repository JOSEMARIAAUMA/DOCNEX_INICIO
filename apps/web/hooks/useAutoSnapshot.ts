import { useEffect, useRef, useState } from 'react';
import { DocumentBlock } from '@docnex/shared';
import { createSnapshot, shouldCreateSnapshot, getSnapshotDescription } from '@/lib/snapshot-utils';

interface UseAutoSnapshotOptions {
    documentId: string;
    blocks: DocumentBlock[];
    enabled?: boolean;
    intervalMs?: number; // Default: 5 minutes
}

/**
 * Hook that automatically creates snapshots of the document at regular intervals
 * Only creates snapshots if there have been changes since the last snapshot
 */
export function useAutoSnapshot({
    documentId,
    blocks,
    enabled = true,
    intervalMs = 5 * 60 * 1000 // 5 minutes
}: UseAutoSnapshotOptions) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSnapshotTime, setLastSnapshotTime] = useState<number | null>(null);
    const [lastBlocksHash, setLastBlocksHash] = useState<string>('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a simple hash of blocks to detect changes
    const getBlocksHash = (blocks: DocumentBlock[]): string => {
        return blocks.map(b => `${b.id}:${b.content.length}:${b.title}`).join('|');
    };

    // Create snapshot if conditions are met
    const tryCreateSnapshot = async () => {
        if (!enabled || !documentId || blocks.length === 0) return;

        const currentHash = getBlocksHash(blocks);

        // Check if blocks have changed
        if (currentHash === lastBlocksHash) {
            console.log('No changes detected, skipping auto-snapshot');
            return;
        }

        // Check if enough time has passed
        if (!shouldCreateSnapshot(lastSnapshotTime, intervalMs)) {
            console.log('Not enough time passed since last snapshot');
            return;
        }

        setIsSaving(true);
        try {
            const description = getSnapshotDescription('auto_save');
            const result = await createSnapshot(documentId, description, blocks, 'auto_save');

            if (result.success) {
                setLastSnapshotTime(Date.now());
                setLastBlocksHash(currentHash);
                console.log('✅ Auto-snapshot created successfully');
            } else {
                console.error('Failed to create auto-snapshot:', result.error);
            }
        } catch (error) {
            console.error('Error in auto-snapshot:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Set up interval
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Create initial snapshot after 30 seconds
        const initialTimeout = setTimeout(() => {
            tryCreateSnapshot();
        }, 30000);

        // Then create snapshots at regular intervals
        intervalRef.current = setInterval(() => {
            tryCreateSnapshot();
        }, intervalMs);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, documentId, blocks, intervalMs]);

    // Update hash when blocks change (but don't create snapshot immediately)
    useEffect(() => {
        const currentHash = getBlocksHash(blocks);
        if (currentHash !== lastBlocksHash && lastBlocksHash === '') {
            // First load, just set the hash
            setLastBlocksHash(currentHash);
        }
    }, [blocks]);

    return {
        isSaving,
        lastSnapshotTime,
        manualSnapshot: tryCreateSnapshot,
    };
}
