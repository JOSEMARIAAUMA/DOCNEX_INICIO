import { DocumentBlock } from '@docnex/shared';
import { supabase } from './supabase/client';

/**
 * Creates a snapshot of the current document state
 */
export async function createSnapshot(
    documentId: string,
    description: string,
    blocks: DocumentBlock[],
    actionType: 'auto_save' | 'pre_delete' | 'pre_merge' | 'pre_migration' | 'manual' = 'manual'
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
        // Create snapshot with all blocks
        const snapshot = blocks.map(block => ({
            id: block.id,
            title: block.title,
            content: block.content,
            order_index: block.order_index,
            parent_block_id: block.parent_block_id,
            block_type: block.block_type,
        }));

        const { data, error } = await supabase
            .from('document_history')
            .insert([{
                document_id: documentId,
                action_type: actionType,
                description,
                snapshot,
                metadata: {
                    block_count: blocks.length,
                    timestamp: new Date().toISOString(),
                }
            }])
            .select()
            .single();

        if (error) throw error;

        // Clean old snapshots (keep last 50)
        await cleanOldSnapshots(documentId);

        return { success: true, snapshotId: data.id };
    } catch (error) {
        console.error('Error creating snapshot:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Removes old snapshots, keeping only the last 50
 */
async function cleanOldSnapshots(documentId: string): Promise<void> {
    try {
        // Get all snapshots for this document, ordered by creation date
        const { data: snapshots } = await supabase
            .from('document_history')
            .select('id, created_at')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (!snapshots || snapshots.length <= 50) return;

        // Delete snapshots beyond the 50th
        const toDelete = snapshots.slice(50).map(s => s.id);

        await supabase
            .from('document_history')
            .delete()
            .in('id', toDelete);

        console.log(`Cleaned ${toDelete.length} old snapshots`);
    } catch (error) {
        console.error('Error cleaning old snapshots:', error);
    }
}

/**
 * Checks if enough time has passed since last snapshot
 */
export function shouldCreateSnapshot(lastSnapshotTime: number | null, intervalMs: number = 5 * 60 * 1000): boolean {
    if (!lastSnapshotTime) return true;
    return Date.now() - lastSnapshotTime >= intervalMs;
}

/**
 * Generates a description for automatic snapshots
 */
export function getSnapshotDescription(actionType: string, context?: any): string {
    switch (actionType) {
        case 'auto_save':
            return 'Auto-guardado periódico';
        case 'pre_delete':
            return `Antes de eliminar ${context?.count || 1} bloque(s)`;
        case 'pre_merge':
            return `Antes de fusionar ${context?.count || 2} bloques`;
        case 'pre_migration':
            return 'Backup antes de migración de base de datos';
        case 'manual':
            return context?.description || 'Snapshot manual';
        default:
            return 'Snapshot del sistema';
    }
}
