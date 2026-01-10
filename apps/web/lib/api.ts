import { supabase } from './supabase/client';
export type { Project, Document, DocumentBlock, Resource, BlockResourceLink, ResourceExtract, BlockComment, BlockVersion, DocumentHistory } from '@docnex/shared';
import {
    Workspace, Project, Document, DocumentBlock, Resource,
    ResourceExtract, BlockResourceLink, BlockHighlight, BlockComment,
    BlockVersion, DocumentHistory, BlockCommentReply, SemanticLink
} from '@docnex/shared';


// For MVP, we'll hardcode a default workspace and project if they don't exist, 
// or fetch the first one found.
export const getActiveProject = async (): Promise<Project | null> => {
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching project:', error);
        return null;
    }

    return projects?.[0] || null;
};

// Documents
export const listDocuments = async (projectId: string, category: string = 'main'): Promise<Document[]> => {
    // Fetch all docs for this category
    let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('category', category)
        .order('updated_at', { ascending: false });

    console.log(`[API] listDocuments calling supabase for project ${projectId} category ${category}`);
    const { data, error } = await query;

    if (error) {
        console.error('[API] listDocuments Supabase Error:', JSON.stringify(error, null, 2));
        throw error;
    }

    return data || [];
};

export const getDocument = async (id: string): Promise<Document | null> => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error('[API] getDocument Error:', error);
        throw error;
    }
    return data;
}

export const createDocument = async (projectId: string, title: string, category: string = 'main'): Promise<Document | null> => {
    const row: any = { project_id: projectId, title, category };

    console.log('[API] createDocument inserting:', row);
    const { data, error } = await supabase
        .from('documents')
        .insert([row])
        .select()
        .single();

    if (error) {
        console.error('[API] createDocument Error details:', JSON.stringify(error, null, 2));
        throw error;
    }
    return data;
};

export const updateDocument = async (id: string, updates: Partial<Document>): Promise<Document | null> => {
    const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export const deleteDocument = async (id: string): Promise<void> => {
    // Hard delete for now, or check requirements. User asked for "eliminarlos" AND "archivarlos".
    // Usually "eliminarlos" means delete.
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export const archiveDocument = async (id: string): Promise<Document | null> => {
    return updateDocument(id, { status: 'archived' });
}

export const duplicateDocument = async (id: string, newTitle?: string): Promise<Document | null> => {
    // 1. Get original doc
    const original = await getDocument(id);
    if (!original) throw new Error("Document not found");

    // 2. Create new doc
    const created = await createDocument(original.project_id, newTitle || `${original.title} (Copy)`, original.category);
    if (!created) throw new Error("Failed to create duplication");

    // 3. Get blocks
    const blocks = await listBlocks(id);

    // 4. Duplicate blocks
    if (blocks.length > 0) {
        const blocksToInsert = blocks.map(b => ({
            document_id: created.id,
            content: b.content,
            title: b.title,
            order_index: b.order_index,
            tags: b.tags,
            block_type: b.block_type || 'text'
        }));

        const { error: blocksError } = await supabase
            .from('document_blocks')
            .insert(blocksToInsert);

        if (blocksError) console.error("Error duplicating blocks", blocksError);
    }

    return created;
}



// Blocks
export const listBlocks = async (documentId: string): Promise<DocumentBlock[]> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index', { ascending: true }); // Make sure to use order_index

    if (error) throw error;
    return data || [];
};

/**
 * Special list for the Full View that includes related metadata
 */
export const listBlocksForViewer = async (documentId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .select(`
            *,
            block_versions(id, version_number, title, created_at),
            block_resource_links(id, resource_id, resource:resources(title, kind))
        `)
        .eq('document_id', documentId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
};

import { extractKeywords } from './ai/keyword-extractor';

// ... (existing imports)

// ...

export const createBlock = async (documentId: string, content: string, orderIndex: number, title: string = 'New Block', tags?: string[]): Promise<DocumentBlock | null> => {
    // Auto-generate tags if not provided, or merge? 
    // For now, if tags is undefined, we generate.
    // console.log(`[API] createBlock inserting block for doc ${documentId}. Tags:`, finalTags);

    const { data, error } = await supabase
        .from('document_blocks')
        .insert([{ document_id: documentId, content, order_index: orderIndex, title: title || 'New Block', is_deleted: false }]) // Added title back as it is REQUIRED
        .select()
        .single();

    if (error) {
        console.error('[API] createBlock Error details:', JSON.stringify(error, null, 2));
        throw error;
    }
    return data;
};

export const updateBlock = async (id: string, content: string, tags?: string[]): Promise<DocumentBlock | null> => {
    const updates: any = { content, last_edited_at: new Date().toISOString() };

    // If tags passed explicitly, use them. If not, we don't necessarily want to re-generate on every keystroke save unless requested.
    // However, the user asked for "auto-tagging".
    // BlockContentEditor handles generation manually in handleSave via logic. 
    // Here we just persist what is sent.
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabase
        .from('document_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getBlock = async (blockId: string): Promise<DocumentBlock> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('id', blockId)
        .single();
    if (error) throw error;
    return data;
};

// Resources
// Resources
export const createResource = async (projectId: string, title: string, kind: 'pdf' | 'docx' | 'url' | 'other', meta?: any, documentId?: string) => {
    const { data, error } = await supabase
        .from('resources')
        .insert([{
            project_id: projectId,
            document_id: documentId,
            title,
            kind,
            meta: meta || {},
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const listResources = async (projectId: string, documentId?: string) => {
    let query = supabase
        .from('resources')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    // Enforce Strict Isolation if documentId is provided
    if (documentId) {
        query = query.eq('document_id', documentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

// Links
export const listBlockLinks = async (blockId: string): Promise<BlockResourceLink[]> => {
    // We also want to fetch the resource details
    const { data, error } = await supabase
        .from('block_resource_links')
        .select('*, resource:resources(*)')
        .eq('block_id', blockId);

    if (error) throw error;
    return data || [];
};

export const createLink = async (blockId: string, resourceId: string, extractId?: string): Promise<BlockResourceLink | null> => {
    const { data, error } = await supabase
        .from('block_resource_links')
        .insert([{ block_id: blockId, resource_id: resourceId, extract_id: extractId }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export const removeLink = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('block_resource_links')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// Block updates
export const updateBlockTitle = async (id: string, title: string): Promise<DocumentBlock | null> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .update({ title, last_edited_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteBlock = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('document_blocks')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// Resource updates
export const updateResource = async (id: string, updates: Partial<Resource>): Promise<Resource | null> => {
    const { data, error } = await supabase
        .from('resources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteResource = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

/**
 * Fetch the actual content of a resource (for integrated viewer)
 */
export const fetchResourceContent = async (id: string): Promise<{ content: string, type: string }> => {
    const { data, error } = await supabase
        .from('resources')
        .select('title, kind, file_path, meta')
        .eq('id', id)
        .single();

    if (error) throw error;

    // For now, if it's a 'text' kind or has content in meta, return it.
    // In a real app, this might fetch from storage or a specific table.
    return {
        content: data.meta?.content || `Contenido de ejemplo para: ${data.title}`,
        type: data.kind
    };
};

// Document delete


// ============================================================
// SPRINT 2: Enhanced Block Operations
// ============================================================

/**
 * List only active (non-deleted) blocks
 */
export const listActiveBlocks = async (documentId: string): Promise<DocumentBlock[]> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_deleted', false)
        .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
};

/**
 * List deleted blocks (trash)
 */
export const listDeletedBlocks = async (documentId: string): Promise<DocumentBlock[]> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_deleted', true)
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

/**
 * Soft delete a block (move to trash)
 */
export const softDeleteBlock = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('document_blocks')
        .update({
            is_deleted: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
    if (error) throw error;
};

/**
 * Create a sub-block
 */
export const createSubBlock = async (documentId: string, parentBlockId: string, content: string, orderIndex: number, title: string = 'New Sub-block'): Promise<DocumentBlock | null> => {
    const { data, error } = await supabase
        .from('document_blocks')
        .insert([{
            document_id: documentId,
            parent_block_id: parentBlockId,
            content,
            order_index: orderIndex,
            title
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Restore a soft-deleted block
 */
export const restoreBlock = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('document_blocks')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
};

/**
 * Reorder blocks by updating order_index for all provided block IDs
 */
export const reorderBlocks = async (documentId: string, orderedIds: string[]): Promise<void> => {
    // Update each block's order_index based on its position in the array
    const updates = orderedIds.map((id, index) =>
        supabase
            .from('document_blocks')
            .update({ order_index: index, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('document_id', documentId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw errors[0].error;
};

/**
 * Duplicate a block
 */
export const duplicateBlock = async (blockId: string): Promise<DocumentBlock | null> => {
    // Get original block
    const { data: original, error: fetchError } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

    if (fetchError) throw fetchError;
    if (!original) return null;

    // Get max order_index for the document
    const { data: blocks } = await supabase
        .from('document_blocks')
        .select('order_index')
        .eq('document_id', original.document_id)
        .eq('is_deleted', false)
        .order('order_index', { ascending: false })
        .limit(1);

    const maxOrder = blocks?.[0]?.order_index ?? 0;

    // Create duplicate
    const { data, error } = await supabase
        .from('document_blocks')
        .insert([{
            document_id: original.document_id,
            title: `${original.title} (copy)`,
            content: original.content,
            order_index: maxOrder + 1,
            block_type: original.block_type
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Merge two consecutive blocks into one
 */
export const mergeBlocks = async (keepBlockId: string, mergeBlockId: string, separator: string = '\n\n'): Promise<DocumentBlock | null> => {
    // Get both blocks
    const { data: blocks, error: fetchError } = await supabase
        .from('document_blocks')
        .select('*')
        .in('id', [keepBlockId, mergeBlockId]);

    if (fetchError) throw fetchError;
    if (!blocks || blocks.length !== 2) return null;

    const keepBlock = blocks.find(b => b.id === keepBlockId);
    const mergeBlock = blocks.find(b => b.id === mergeBlockId);

    if (!keepBlock || !mergeBlock) return null;

    // Update keep block with merged content
    const { data, error: updateError } = await supabase
        .from('document_blocks')
        .update({
            content: `${keepBlock.content}${separator}${mergeBlock.content}`,
            title: `${keepBlock.title} + ${mergeBlock.title}`,
            last_edited_at: new Date().toISOString()
        })
        .eq('id', keepBlockId)
        .select()
        .single();

    if (updateError) throw updateError;

    // Soft delete the merged block
    await softDeleteBlock(mergeBlockId);

    return data;
};

/**
 * Split a block at a given text position
 */
export const splitBlock = async (blockId: string, splitIndex: number): Promise<DocumentBlock | null> => {
    // Get original block
    const { data: original, error: fetchError } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

    if (fetchError) throw fetchError;
    if (!original) return null;

    const beforeText = original.content.substring(0, splitIndex).trim();
    const afterText = original.content.substring(splitIndex).trim();

    // Update original with first part
    await supabase
        .from('document_blocks')
        .update({
            content: beforeText,
            last_edited_at: new Date().toISOString()
        })
        .eq('id', blockId);

    // Create new block with second part
    const { data: newBlock, error } = await supabase
        .from('document_blocks')
        .insert([{
            document_id: original.document_id,
            title: `${original.title} (continued)`,
            content: afterText,
            order_index: original.order_index + 0.5, // Will need normalization
            block_type: original.block_type
        }])
        .select()
        .single();

    if (error) throw error;

    // Normalize order_index for all blocks
    const { data: allBlocks } = await supabase
        .from('document_blocks')
        .select('id')
        .eq('document_id', original.document_id)
        .eq('is_deleted', false)
        .order('order_index', { ascending: true });

    if (allBlocks) {
        await reorderBlocks(original.document_id, allBlocks.map(b => b.id));
    }

    return newBlock;
};

// ============================================================
// SPRINT 2: File Upload Resource Creation
// ============================================================

interface FileResourceData {
    projectId: string;
    title: string;
    kind: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
}

/**
 * Create a resource with file metadata
 */
export const createFileResource = async (data: FileResourceData): Promise<Resource | null> => {
    const { data: resource, error } = await supabase
        .from('resources')
        .insert([{
            project_id: data.projectId,
            title: data.title,
            kind: data.kind,
            file_path: data.filePath,
            mime_type: data.mimeType,
            file_size: data.fileSize,
            ingest_status: 'pending'
        }])
        .select()
        .single();

    if (error) throw error;
    return resource;
};

/**
 * Update resource tags
 */
export const updateResourceTags = async (id: string, tags: string[]): Promise<void> => {
    const { error } = await supabase
        .from('resources')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
};

// ============================================================
// SPRINT 2.1: Resource Extracts
// ============================================================

/**
 * List extracts for a specific resource
 */
export const listResourceExtracts = async (resourceId: string): Promise<ResourceExtract[]> => {
    const { data, error } = await supabase
        .from('resource_extracts')
        .select('*')
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

/**
 * Create a new extract from a resource
 */
export const createResourceExtract = async (resourceId: string, excerpt: string, label: string = 'Extract', locator: any = {}): Promise<ResourceExtract | null> => {
    const { data, error } = await supabase
        .from('resource_extracts')
        .insert([{
            resource_id: resourceId,
            excerpt,
            label,
            locator
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

// ============================================================
// SPRINT 3: Block Comments (Notes)
// ============================================================

export const listBlockComments = async (blockId: string): Promise<BlockComment[]> => {
    const { data, error } = await supabase
        .from('block_comments')
        .select('*')
        .eq('block_id', blockId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const createBlockComment = async (
    blockId: string,
    textSelection: string,
    content: string,
    commentType: 'review' | 'ai_instruction' = 'review',
    startOffset: number = 0,
    endOffset: number = 0,
    meta: Record<string, unknown> = {}
): Promise<BlockComment | null> => {
    const { data, error } = await supabase
        .from('block_comments')
        .insert([{
            block_id: blockId,
            text_selection: textSelection,
            content,
            comment_type: commentType,
            start_offset: startOffset,
            end_offset: endOffset,
            meta
        }])
        .select()
        .single();
    if (error) {
        console.error('Supabase error in createBlockComment:', error);
        console.error('Payload attempted:', { blockId, textSelection, content, commentType, startOffset, endOffset, meta });
        throw error;
    }
    return data;
};

export const updateBlockComment = async (
    commentId: string,
    updates: Partial<BlockComment>
): Promise<BlockComment | null> => {
    const { data, error } = await supabase
        .from('block_comments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const resolveBlockComment = async (commentId: string): Promise<void> => {
    const { error } = await supabase
        .from('block_comments')
        .update({ resolved: true })
        .eq('id', commentId);
    if (error) throw error;
};

export const deleteBlockComment = async (commentId: string): Promise<void> => {
    const { error } = await supabase
        .from('block_comments')
        .delete()
        .eq('id', commentId);
    if (error) throw error;
};

// Note Replies
export const listCommentReplies = async (commentId: string) => {
    const { data, error } = await supabase
        .from('block_comment_replies')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const addCommentReply = async (commentId: string, content: string, userId?: string) => {
    const { data, error } = await supabase
        .from('block_comment_replies')
        .insert([{ comment_id: commentId, content, user_id: userId }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

// ============================================================
// SPRINT 3: Block Versions
// ============================================================

export const listBlockVersions = async (blockId: string): Promise<BlockVersion[]> => {
    const { data, error } = await supabase
        .from('block_versions')
        .select('*')
        .eq('block_id', blockId)
        .order('version_number', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const createBlockVersion = async (block: DocumentBlock): Promise<BlockVersion | null> => {
    // Get current max version number
    const { data: existing } = await supabase
        .from('block_versions')
        .select('version_number')
        .eq('block_id', block.id)
        .order('version_number', { ascending: false })
        .limit(1);

    const nextVersion = (existing && existing.length > 0) ? existing[0].version_number + 1 : 1;

    const { data, error } = await supabase
        .from('block_versions')
        .insert([{
            block_id: block.id,
            version_number: nextVersion,
            title: block.title,
            content: block.content,
            is_active: false
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const restoreBlockVersion = async (versionId: string): Promise<{ title: string; content: string } | null> => {
    const { data: version, error } = await supabase
        .from('block_versions')
        .select('title, content, block_id')
        .eq('id', versionId)
        .single();
    if (error) throw error;
    if (!version) return null;

    // Update the block with the version content
    const { error: updateError } = await supabase
        .from('document_blocks')
        .update({
            title: version.title,
            content: version.content,
            updated_at: new Date().toISOString()
        })
        .eq('id', version.block_id);
    if (updateError) throw updateError;

    return { title: version.title, content: version.content };
};

export const deleteBlockVersion = async (versionId: string): Promise<void> => {
    const { error } = await supabase
        .from('block_versions')
        .delete()
        .eq('id', versionId);
    if (error) throw error;
};

// ============================================================
// SPRINT 4: Document History
// ============================================================

export const listDocumentHistory = async (documentId: string): Promise<DocumentHistory[]> => {
    const { data, error } = await supabase
        .from('document_history')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// ============================================================
// SPRINT 5: Semantic Network
// ============================================================

export const createSemanticLink = async (link: Partial<SemanticLink>): Promise<SemanticLink | null> => {
    const { data, error } = await supabase
        .from('semantic_links')
        .insert([link])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteSemanticLink = async (linkId: string): Promise<void> => {
    const { error } = await supabase
        .from('semantic_links')
        .delete()
        .eq('id', linkId);
    if (error) throw error;
};

export const listSemanticLinksByBlock = async (blockId: string): Promise<SemanticLink[]> => {
    const { data, error } = await supabase
        .from('semantic_links')
        .select('*')
        .eq('source_block_id', blockId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const listSemanticLinksByDocument = async (documentId: string): Promise<SemanticLink[]> => {
    const { data, error } = await supabase
        .from('semantic_links')
        .select('*')
        .eq('target_document_id', documentId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getBacklinksByBlock = async (blockId: string): Promise<SemanticLink[]> => {
    const { data, error } = await supabase
        .from('semantic_links')
        .select('*')
        .eq('target_block_id', blockId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};
