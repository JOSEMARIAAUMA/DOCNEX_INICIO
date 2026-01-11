import { ImportItem, SplitStrategy } from './types';
import { BlockItem } from './schemas';

// Server Actions
import { splitDocumentWithAI, chatWithAI, analyzeTextWithAI } from '@/actions/ai';
import { AIContext } from '@/types/ai';

// Legacy imports for fallback compatibility
import { splitByHeader, splitByPattern } from './classifiers';
import { splitByIndex, splitBySmartNumbering } from './smart-splitter';

// Security & Validation imports
import { sanitizeInput, rateLimiter } from './input-sanitizer';
import { validateImportItem } from './validation-schemas';
import { AIValidationError, AITimeoutError, AISecurityError } from './ai-error-types';

/**
 * AI Agent powered by Gemini 2.5 Flash (via Server Actions)
 * Replaces the old regex-based system with real AI understanding
 */
export class AIAgent {

    constructor() {
        // No need to check env here as we delegate to server actions
    }

    /**
     * Process text using AI or fallback to legacy methods
     * NOW WITH SECURITY PATCHES: size limits, timeouts, validation
     */
    async processText(
        text: string,
        strategy: SplitStrategy,
        options: {
            headerLevel?: number;
            customPattern?: string;
            childPattern?: string;
            isHierarchical?: boolean;
            indexText?: string;
            context?: AIContext; // Added Global Context
        } = {},
        timeout: number = 60000 // Increased timeout for AI
    ): Promise<ImportItem[]> {
        // SECURITY PATCH #1: File size validation (max 5MB)
        const MAX_TEXT_SIZE = 5 * 1024 * 1024;
        if (text.length > MAX_TEXT_SIZE) {
            throw new AIValidationError(
                `Text too large: ${(text.length / 1024 / 1024).toFixed(2)}MB (max 5MB)`,
                ['Input exceeds maximum size']
            );
        }

        // SECURITY PATCH #2: Empty input check
        if (!text || text.trim().length === 0) {
            throw new AIValidationError('Input text is empty', ['Empty input']);
        }

        // SECURITY PATCH #3: Add timeout wrapper
        return Promise.race([
            this._processTextInternal(text, strategy, options),
            new Promise<ImportItem[]>((_, reject) =>
                setTimeout(
                    () => reject(new AITimeoutError(`Processing timed out after ${timeout}ms`)),
                    timeout
                )
            )
        ]);
    }

    /**
     * Internal processing method (wrapped with timeout)
     */
    private async _processTextInternal(
        text: string,
        strategy: SplitStrategy,
        options: any
    ): Promise<ImportItem[]> {
        const { headerLevel = 2, customPattern = '', indexText = '', context } = options;

        // Try using AI Server Action first
        if (strategy === 'semantic' || strategy === 'index' || strategy === 'header') { // Enhanced 'header' with simple AI check if needed? No, stick to legacy for header unless specifically requested? 
            // Actually, let's prefer AI for complex strategies or if we want "Smart" behavior
            // For now, only semantic/index MUST use AI.

            try {
                const instructions = this.buildInstructions(strategy, options);

                // Call Server Action
                const result = await splitDocumentWithAI(text, instructions, context);

                if (result.success && result.blocks) {
                    const items = this.convertBlocksToImportItems(result.blocks);
                    // SECURITY PATCH #4: Validate all AI responses
                    return this.validateAndSanitizeItems(items);
                } else {
                    console.warn('[AIAgent] Server Action failed:', result.error);
                    // Fallback to legacy if AI fails
                }
            } catch (error) {
                console.error('[AIAgent] AI processing failed, falling back:', error);
                // Fall through to legacy mode
            }
        }

        // Legacy fallback mode (regex-based)
        const legacyItems = await this.processTextLegacy(text, strategy, options);
        return this.validateAndSanitizeItems(legacyItems);
    }

    /**
     * Build natural language instructions for Gemini
     */
    private buildInstructions(strategy: SplitStrategy, options: any): string {
        if (strategy === 'index' && options.indexText) {
            return `Divide el documento según este índice de referencia:\n\n${options.indexText}\n\nExtrae cada sección mencionada en el índice como un bloque separado.`;
        }

        if (strategy === 'semantic') {
            return 'Divide este documento en bloques lógicos según su estructura semántica y temática. Identifica secciones, capítulos, artículos o temas principales.';
        }

        // Default
        return 'Analiza este documento y divídelo en bloques estructurados según su organización natural.';
    }

    /**
     * Convert Gemini BlockItem[] to ImportItem[] (legacy format for wizard)
     */
    private convertBlocksToImportItems(blocks: BlockItem[]): ImportItem[] {
        return blocks.map(block => ({
            id: crypto.randomUUID(),
            title: block.title,
            content: block.content,
            target: block.target || 'active_version',
            children: block.children ? this.convertBlocksToImportItems(block.children) : undefined
        }));
    }

    /**
     * SECURITY PATCH #4: Validate and sanitize all ImportItems
     */
    private validateAndSanitizeItems(items: ImportItem[]): ImportItem[] {
        return items.map(item => {
            const validation = validateImportItem(item);

            if (!validation.success) {
                console.warn('[AIAgent] Invalid ImportItem detected, using fallback:', validation.errors);
                // Return safe fallback
                return {
                    id: crypto.randomUUID(),
                    title: item.title || 'Invalid Block',
                    content: item.content || '',
                    target: 'active_version' as const
                };
            }

            // Recursively validate children
            if (validation.data.children && validation.data.children.length > 0) {
                validation.data.children = this.validateAndSanitizeItems(validation.data.children);
            }

            return validation.data;
        });
    }

    /**
     * Legacy regex-based processing (fallback when Gemini unavailable)
     */
    private async processTextLegacy(
        text: string,
        strategy: SplitStrategy,
        options: any
    ): Promise<ImportItem[]> {
        const { headerLevel = 2, customPattern = '', indexText = '' } = options;

        if (strategy === 'index' && indexText) {
            const results = splitByIndex(text, indexText);
            return results.map(r => ({
                id: crypto.randomUUID(),
                title: r.title,
                content: r.content,
                target: 'active_version'
            }));
        }

        switch (strategy) {
            case 'header':
                return splitByHeader(text, headerLevel);
            case 'custom':
                if (customPattern === 'SMART_NUMBERING') {
                    const results = splitBySmartNumbering(text);
                    return results.map(r => ({
                        id: crypto.randomUUID(),
                        title: r.title,
                        content: r.content,
                        target: 'active_version'
                    }));
                }
                return splitByPattern(text, customPattern);
            case 'semantic':
                // Legacy semantic was just a mock, return full text as one block
                return [{
                    id: crypto.randomUUID(),
                    title: 'Documento Completo',
                    content: text,
                    target: 'active_version'
                }];
            case 'manual':
            default:
                return [{
                    id: crypto.randomUUID(),
                    title: 'Imported Text',
                    content: text,
                    target: 'active_version'
                }];
        }
    }

    /**
     * Generate regex patterns from examples
     */
    async generatePatternsFromExamples(examples: string, context?: AIContext): Promise<{ parentPattern: string; childPattern: string }> {
        try {
            const response = await chatWithAI(
                `Dado este ejemplo de inicio de bloque: "${examples}", ¿qué patrón regex usarías para detectar bloques similares? Responde SOLO con el regex, sin explicaciones.`,
                { userInstructions: 'Generar patrón desde ejemplo' },
                context
            );

            if (response.success && response.reply) {
                return { parentPattern: response.reply.trim(), childPattern: '' };
            }
        } catch (error) {
            console.error('[AIAgent] Error generating pattern with AI:', error);
        }

        // Legacy fallback
        return this.generatePatternsLegacy(examples);
    }

    private generatePatternsLegacy(examples: string): { parentPattern: string; childPattern: string } {
        const trimmed = examples.trim();
        if (trimmed.length < 1) return { parentPattern: '', childPattern: '' };

        const headerMatch = trimmed.match(/^(#{1,6})\s+/);
        if (headerMatch) {
            const hashes = headerMatch[1];
            return { parentPattern: `^${hashes}\\s+.+`, childPattern: '' };
        }

        if (/^\d+[\.\)]\s+.+/.test(trimmed)) {
            const separator = trimmed.match(/^\d+([\.\)])/)?.[1] || '.';
            return { parentPattern: `^\\d+\\${separator}`, childPattern: '' };
        }

        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { parentPattern: `^${escaped}`, childPattern: '' };
    }

    /**
     * Smart chat with document context
     * NOW WITH SECURITY PATCHES: input sanitization, rate limiting
     */
    async chat(
        message: string,
        context: {
            strategy: SplitStrategy;
            currentPattern: string;
            textPreview: string;
            isSubBlock?: boolean;
            globalContext?: AIContext; // Added Global Context
        }
    ): Promise<{ reply: string; action?: { type: 'set_pattern' | 'set_index' | 'set_strategy'; value: string } }> {
        // SECURITY PATCH #5: Rate limiting
        if (!rateLimiter.canMakeRequest()) {
            const waitTime = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
            return {
                reply: `Has excedido el límite de solicitudes. Por favor, espera ${waitTime} segundos.`
            };
        }

        // SECURITY PATCH #6: Input sanitization for prompt injection
        const sanitized = sanitizeInput(message, 10000); // 10KB max for chat
        if (sanitized.blocked) {
            throw new AISecurityError(
                sanitized.blockReason || 'Invalid input detected',
                'prompt_injection'
            );
        }

        try {
            const result = await chatWithAI(message, {
                documentPreview: context.textPreview,
                currentStrategy: context.strategy,
                userInstructions: context.currentPattern
            }, context.globalContext);

            if (result.success && result.reply) {
                return { reply: result.reply };
            } else {
                return { reply: 'Lo siento, hubo un error técnico. Inténtalo de nuevo.' };
            }
        } catch (error) {
            console.error('[AIAgent] Chat error:', error);
            // Fallback to legacy chat if network fails? No, legacy was too basic.
            return { reply: 'Error de conexión con el agente IA.' };
        }
    }

    /**
     * Analyze text for quick insights
     */
    async analyzeText(text: string, type: 'summary' | 'structure' = 'summary', context?: AIContext): Promise<string> {
        const result = await analyzeTextWithAI(text, type, context);
        if (result.success && result.analysis) {
            return result.analysis;
        }
        return 'Análisis no disponible';
    }

    /**
     * Detect if text contains a table of contents
     */
    async detectIndexFromText(text: string): Promise<string | null> {
        if (!text) return null;

        const tocHeaderRegex = /^#{0,3}\s*(?:Índice|Tabla de Contenidos|Table of Contents|Contenido|Sumario)(?:\s+de\s+Contenido)?\s*$/im;
        const match = text.match(tocHeaderRegex);

        if (match && match.index !== undefined) {
            const afterHeader = text.slice(match.index + match[0].length, match.index + match[0].length + 2000);
            return afterHeader.trim();
        }

        return null;
    }
}

export const aiAgent = new AIAgent();
