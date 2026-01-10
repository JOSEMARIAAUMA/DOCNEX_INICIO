
export type ImportTarget = 'active_version' | 'version' | 'linked_ref' | 'unlinked_ref' | 'note';

export type SplitStrategy = 'header' | 'semantic' | 'manual' | 'custom' | 'index' | 'smart' | 'selection' | 'single';

export interface ImportItem {
    id: string;
    title: string;
    content: string;
    target: ImportTarget;
    category?: 'main' | 'version' | 'linked_ref' | 'unlinked_ref';
    tags?: string[];
    level?: number;
    parentId?: string; // Reference to parent's local ID
    children?: ImportItem[]; // For nested structures in memory
}

export interface ClassificationResult {
    items: ImportItem[];
    originalText: string;
    strategy: SplitStrategy;
}
