export interface Workspace {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Document {
    id: string;
    project_id: string;
    title: string;
    description?: string | null;
    category?: 'main' | 'version' | 'linked_ref' | 'unlinked_ref';
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DocumentBlock {
    id: string;
    document_id: string;
    order_index: number;
    title: string;
    content: string;
    last_edited_at: string | null;
    is_deleted: boolean;
    parent_block_id: string | null;
    block_type: 'section' | 'note' | 'quote' | 'table';
    created_at: string;
    updated_at: string;
}

export interface Resource {
    id: string;
    project_id: string;
    kind: 'pdf' | 'docx' | 'url' | 'note' | 'image' | 'txt' | 'other';
    title: string;
    source_uri: string | null;
    file_path: string | null;
    mime_type: string | null;
    file_size: number | null;
    ingest_status: 'pending' | 'processed' | 'failed';
    extracted_text: string | null;
    tags: string[];
    meta: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface ResourceExtract {
    id: string;
    resource_id: string;
    label: string | null;
    excerpt: string;
    locator: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface BlockResourceLink {
    id: string;
    block_id: string;
    resource_id: string;
    extract_id: string | null;
    relation: 'supports' | 'cites' | 'contradicts' | 'todo' | 'reference';
    note: string | null;
    created_at: string;
}

export interface BlockAction {
    id: string;
    block_id: string;
    action_type: 'rewrite' | 'summarize' | 'clean' | 'retitle' | 'merge_suggest' | 'split_suggest';
    input: Record<string, unknown>;
    output: string | null;
    status: 'pending' | 'done' | 'failed';
    created_at: string;
}

export interface BlockHighlight {
    id: string;
    block_id: string;
    resource_id: string | null;
    extract_id: string | null;
    start_index: number;
    end_index: number;
    selected_text: string;
    label: string | null;
    color: string;
    created_at: string;
}

export interface BlockComment {
    id: string;
    block_id: string;
    text_selection: string;
    start_offset: number;
    end_offset: number;
    content: string;
    comment_type: 'review' | 'ai_instruction';
    resolved: boolean;
    meta: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface BlockVersion {
    id: string;
    block_id: string;
    version_number: number;
    title: string;
    content: string;
    created_at: string;
    is_active: boolean;
}

export interface DocumentHistory {
    id: string;
    document_id: string;
    action_type: 'import_replace' | 'import_merge' | 'restore' | 'bulk_edit';
    description: string;
    snapshot: any[] | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface BlockCommentReply {
    id: string;
    comment_id: string;
    user_id: string | null;
    content: string;
    created_at: string;
    updated_at: string;
}
