import { supabase } from '@/lib/supabase/client';
import { ImportItem } from '@/lib/ai/types';
import { extractKeywords } from '@/lib/ai/keyword-extractor';

export interface ImportResult {
    success: boolean;
    count: number;
}

export async function importItems(
    projectId: string,
    documentId: string,
    items: ImportItem[],
    importMode: 'replace' | 'merge' = 'merge'
): Promise<ImportResult> {
    let count = 0;

    // 1) Log the start of an import and capture snapshot if replacing
    if (importMode === 'replace') {
        const { data: existingBlocks, error: fetchError } = await supabase
            .from('document_blocks')
            .select('*')
            .eq('document_id', documentId)
            .order('order_index', { ascending: true });

        if (!fetchError && existingBlocks && existingBlocks.length > 0) {
            // Save snapshot before deleting
            await supabase.from('document_history').insert({
                document_id: documentId,
                action_type: 'import_replace',
                description: `Sustitución de contenido: ${existingBlocks.length} bloques reemplazados.`,
                snapshot: existingBlocks,
                metadata: { block_count: existingBlocks.length }
            });
        }

        const { error: deleteError } = await supabase
            .from('document_blocks')
            .delete()
            .eq('document_id', documentId);

        if (deleteError) throw new Error(deleteError.message);
    } else {
        // Just log the merge action
        await supabase.from('document_history').insert({
            document_id: documentId,
            action_type: 'import_merge',
            description: `Importación parcial (fusión): Se añadirán nuevos bloques al final.`,
            metadata: { items_to_import: items.length }
        });
    }

    // Group items by target to handle different document creations
    const itemsByTarget: Record<string, ImportItem[]> = {};
    items.forEach(item => {
        const target = item.target || 'active_version';
        if (!itemsByTarget[target]) itemsByTarget[target] = [];
        itemsByTarget[target].push(item);
    });

    for (const [target, targetItems] of Object.entries(itemsByTarget)) {
        let currentDocId = documentId;

        // If not importing into active version, create a new support document
        if (target !== 'active_version') {
            const categoryLabel = target === 'linked_ref' ? 'Referencia Vinculada' :
                target === 'unlinked_ref' ? 'Referencia Externa' :
                    target === 'version' ? 'Versión' : 'Referencia';

            const { data: newDoc, error: docError } = await supabase
                .from('documents')
                .insert({
                    project_id: projectId,
                    title: `Importado: ${categoryLabel} (${new Date().toLocaleDateString('es-ES')})`,
                    category: target === 'note' ? 'linked_ref' : target as any, // fallback for note
                    status: 'draft'
                })
                .select()
                .single();

            if (docError) throw new Error(docError.message);
            currentDocId = newDoc.id;
        }

        let globalOrder = Math.floor(Date.now() / 1000);

        async function insertItemsRecursive(itemsToInsert: ImportItem[], parentId?: string) {
            for (const item of itemsToInsert) {
                // Auto-generate tags for imported items
                const tags = extractKeywords(item.content);

                const { data: newBlock, error } = await supabase
                    .from('document_blocks')
                    .insert({
                        document_id: currentDocId,
                        title: item.title,
                        content: item.content,
                        block_type: 'section',
                        order_index: globalOrder++,
                        parent_block_id: parentId,
                        tags: tags // Insert auto-generated tags
                    })
                    .select()
                    .single();

                if (error) throw new Error(error.message);
                count++;

                if (item.children && item.children.length > 0) {
                    await insertItemsRecursive(item.children, newBlock.id);
                }
            }
        }

        await insertItemsRecursive(targetItems);
    }

    return { success: true, count };
}

export async function restoreDocumentFromHistory(historyId: string): Promise<ImportResult> {
    // 1) Get history record
    const { data: history, error: fetchError } = await supabase
        .from('document_history')
        .select('*')
        .eq('id', historyId)
        .single();

    if (fetchError || !history || !history.snapshot) {
        throw new Error('No se pudo encontrar el registro de historial o no tiene snapshot.');
    }

    const documentId = history.document_id;
    const snapshot = history.snapshot as any[];

    // 2) Save CURRENT state before restoring (so they can undo restoration)
    const { data: currentBlocks } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('document_id', documentId);

    if (currentBlocks && currentBlocks.length > 0) {
        await supabase.from('document_history').insert({
            document_id: documentId,
            action_type: 'restore',
            description: `Snapshot de seguridad antes de restaurar versión del ${new Date(history.created_at).toLocaleDateString()}.`,
            snapshot: currentBlocks
        });
    }

    // 3) Delete all current blocks
    const { error: deleteError } = await supabase
        .from('document_blocks')
        .delete()
        .eq('document_id', documentId);

    if (deleteError) throw new Error(deleteError.message);

    // 4) Restore blocks from snapshot
    const idMapping: Record<string, string> = {};

    // Sort to ensure parents exist before children (assuming parent_block_id null comes first)
    // We can also sort by a possible depth if we had one, but here we just ensure null parents are first.
    const sortedSnapshot = [...snapshot].sort((a, b) => {
        if (!a.parent_block_id && b.parent_block_id) return -1;
        if (a.parent_block_id && !b.parent_block_id) return 1;
        return 0;
    });

    for (const block of sortedSnapshot) {
        const { data: newBlock, error: insertError } = await supabase
            .from('document_blocks')
            .insert({
                document_id: documentId,
                title: block.title,
                content: block.content,
                order_index: block.order_index,
                parent_block_id: block.parent_block_id ? idMapping[block.parent_block_id] : null,
                block_type: block.block_type || 'section'
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);
        idMapping[block.id] = newBlock.id;
    }

    return { success: true, count: snapshot.length };
}
