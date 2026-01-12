import { z } from 'zod';

// Schema for a single document block/item
export type BlockItem = {
    title: string;
    content: string;
    target: "active_version" | "version" | "linked_ref" | "unlinked_ref" | "note" | "section" | "main_content";
    hierarchy_level?: 0 | 1 | 2; // 0=TÍTULO, 1=CAPÍTULO, 2=ARTÍCULO
    order_index?: number;
    children?: BlockItem[];
};

export const BlockItemSchema: z.ZodType<BlockItem> = z.object({
    title: z.string().describe('Título descriptivo del bloque (corto para normativa: TITULO I, CAPITULO 3, etc.)'),
    content: z.string().describe('Contenido completo del bloque en formato HTML o Markdown'),
    target: z.enum(['active_version', 'version', 'linked_ref', 'unlinked_ref', 'note', 'section', 'main_content'])
        .default('active_version')
        .describe('Destino donde se importará este bloque'),
    hierarchy_level: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional()
        .describe('Nivel jerárquico: 0=TÍTULO, 1=CAPÍTULO, 2=ARTÍCULO'),
    order_index: z.number().optional().describe('Índice de orden del bloque'),
    children: z.lazy(() => z.array(BlockItemSchema)).optional()
        .describe('Sub-bloques opcionales (jerarquía de hasta 3 niveles)')
});

// Schema for document splitting result
export const DocumentSplitResultSchema = z.object({
    blocks: z.array(BlockItemSchema).describe('Lista de bloques detectados'),
    metadata: z.object({
        totalBlocks: z.number(),
        strategy: z.string().describe('Estrategia usada por la IA'),
        confidence: z.number().min(0).max(1).optional()
    }).optional()
});

export type DocumentSplitResult = z.infer<typeof DocumentSplitResultSchema>;

// Schema for chat context
export const ChatContextSchema = z.object({
    documentPreview: z.string().optional(),
    currentStrategy: z.string().optional(),
    userInstructions: z.string().optional()
});

export type ChatContext = z.infer<typeof ChatContextSchema>;

// Schema for deep document analysis
export const DeepAnalysisSchema = z.object({
    summary: z.string().describe('Resumen ejecutivo del documento'),
    topic: z.string().describe('Clasificación del tema principal'),
    structure: z.object({
        hierarchy: z.array(z.string()).describe('Niveles jerárquicos detectados (ej: Título, Capítulo)'),
        pattern: z.string().describe('Descripción del patrón estructural')
    }),
    tags: z.array(z.string()).describe('Palabras clave semánticas detectadas'),
    recommendation: z.object({
        strategy: z.string().describe('Nombre de la estrategia de división recomendada'),
        reasoning: z.string().describe('Por qué se recomienda esta estrategia'),
        instructions: z.string().describe('Instrucciones técnicas precisas para la IA de segmentación')
    })
});

export type DeepAnalysisResult = z.infer<typeof DeepAnalysisSchema>;
// Schema for cognitive feedback and learning
export const CognitiveFeedbackSchema = z.object({
    eventId: z.string(),
    timestamp: z.string(),
    sessionId: z.string(),
    action: z.enum(['accept', 'edit', 'reject', 'pause']),
    metrics: z.object({
        editDistance: z.number().optional().describe('Distancia Levenshtein entre propuesta y final'),
        dwellTime: z.number().optional().describe('Tiempo de permanencia en el bloque en ms'),
        burstScore: z.number().optional().describe('Intensidad de edición (teclas/segundo)')
    }),
    context: z.object({
        documentType: z.string().optional(),
        sectionContext: z.string().optional()
    }),
    inferredPreference: z.string().optional().describe('Lo que la IA dedujo de esta interacción')
});

export type CognitiveFeedback = z.infer<typeof CognitiveFeedbackSchema>;
