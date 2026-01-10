import { z } from 'zod';

/**
 * QA VALIDATION SCHEMAS FOR GEMINI INTEGRATION
 * "THE SKEPTIC" - Ensuring AI responses are always valid
 */

// Core Import Target Types
export const ImportTargetSchema = z.enum([
    'active_version',
    'version',
    'linked_ref',
    'unlinked_ref',
    'note'
]);

export const SplitStrategySchema = z.enum([
    'header',
    'semantic',
    'manual',
    'custom',
    'index',
    'smart',
    'selection',
    'single'
]);

// ImportItem Schema - RUNTIME VALIDATION
export type ImportItem = {
    id: string;
    title: string;
    content: string;
    target: "active_version" | "version" | "linked_ref" | "unlinked_ref" | "note";
    category?: "main" | "version" | "linked_ref" | "unlinked_ref" | undefined;
    tags?: string[] | undefined;
    level?: number | undefined;
    parentId?: string | undefined;
    children?: ImportItem[] | undefined;
};

export const ImportItemSchema: z.ZodType<ImportItem> = z.object({
    id: z.string().uuid('Invalid UUID format for ImportItem.id'),
    title: z.string()
        .min(1, 'Title cannot be empty')
        .max(500, 'Title too long (max 500 chars)'),
    content: z.string()
        .min(1, 'Content cannot be empty')
        .max(100000, 'Content too large (max 100KB per block)'),
    target: ImportTargetSchema,
    category: z.enum(['main', 'version', 'linked_ref', 'unlinked_ref']).optional(),
    tags: z.array(z.string()).optional(),
    level: z.number().int().min(0).max(10).optional(),
    parentId: z.string().uuid().optional(),
    children: z.lazy(() => z.array(ImportItemSchema)).optional()
});

// AI Response Schema for Document Splitting
export const AISplitResponseSchema = z.object({
    success: z.boolean(),
    blocks: z.array(ImportItemSchema),
    metadata: z.object({
        totalBlocks: z.number().int().min(0),
        strategy: SplitStrategySchema,
        processingTime: z.number().optional(),
        confidence: z.number().min(0).max(1).optional()
    }).optional(),
    errors: z.array(z.object({
        code: z.string(),
        message: z.string(),
        line: z.number().optional()
    })).optional()
});

export type AISplitResponse = z.infer<typeof AISplitResponseSchema>;

// AI Chat Response Schema
export const AIChatResponseSchema = z.object({
    reply: z.string().min(1).max(2000),
    action: z.object({
        type: z.enum(['set_pattern', 'set_index', 'set_strategy']),
        value: z.string()
    }).optional(),
    confidence: z.number().min(0).max(1).optional()
});

export type AIChatResponse = z.infer<typeof AIChatResponseSchema>;

// Gemini API Error Response Schema
export const GeminiErrorSchema = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        status: z.string().optional()
    })
});

// Input Validation Schemas
export const DocumentUploadSchema = z.object({
    file: z.custom<File>((val) => val instanceof File),
    size: z.number().max(100 * 1024 * 1024, 'File too large (max 100MB)'),
    type: z.enum(['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
});

export const TextInputSchema = z.object({
    text: z.string()
        .min(1, 'Text cannot be empty')
        .max(5 * 1024 * 1024, 'Text too large (max 5MB)'),
    strategy: SplitStrategySchema
});

// Type Guards
export function isImportItem(value: unknown): value is ImportItem {
    return ImportItemSchema.safeParse(value).success;
}

export function isAISplitResponse(value: unknown): value is AISplitResponse {
    return AISplitResponseSchema.safeParse(value).success;
}

export function isAIChatResponse(value: unknown): value is AIChatResponse {
    return AIChatResponseSchema.safeParse(value).success;
}

// Validator Helpers
export function validateImportItem(item: unknown): { success: true; data: ImportItem } | { success: false; errors: string[] } {
    const result = ImportItemSchema.safeParse(item);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
    };
}

export function validateAIResponse(response: unknown): { success: true; data: AISplitResponse } | { success: false; errors: string[] } {
    const result = AISplitResponseSchema.safeParse(response);
    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        };
    }
    return { success: true, data: result.data };
}

// Sanitization result
export interface ValidationResult<T> {
    isValid: boolean;
    data?: T;
    errors?: string[];
    sanitizedData?: T;
}
