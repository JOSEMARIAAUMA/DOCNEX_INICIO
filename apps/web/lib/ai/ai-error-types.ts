/**
 * CUSTOM ERROR TYPES FOR AI OPERATIONS
 * "THE SKEPTIC" - Proper error handling and categorization
 */

export class AIError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'AIError';
        Object.setPrototypeOf(this, AIError.prototype);
    }
}

export class AIValidationError extends AIError {
    constructor(
        message: string,
        public readonly validationErrors: string[]
    ) {
        super(message, 'AI_VALIDATION_ERROR', 400, false);
        this.name = 'AIValidationError';
        Object.setPrototypeOf(this, AIValidationError.prototype);
    }
}

export class AIRateLimitError extends AIError {
    constructor(
        message: string,
        public readonly retryAfter: number // seconds
    ) {
        super(message, 'AI_RATE_LIMIT', 429, true);
        this.name = 'AIRateLimitError';
        Object.setPrototypeOf(this, AIRateLimitError.prototype);
    }
}

export class AITimeoutError extends AIError {
    constructor(message: string) {
        super(message, 'AI_TIMEOUT', 408, true);
        this.name = 'AITimeoutError';
        Object.setPrototypeOf(this, AITimeoutError.prototype);
    }
}

export class AISecurityError extends AIError {
    constructor(
        message: string,
        public readonly reason: 'prompt_injection' | 'malicious_content' | 'file_validation'
    ) {
        super(message, 'AI_SECURITY', 403, false);
        this.name = 'AISecurityError';
        Object.setPrototypeOf(this, AISecurityError.prototype);
    }
}

export class AIServiceError extends AIError {
    constructor(
        message: string,
        public readonly originalError?: unknown
    ) {
        super(message, 'AI_SERVICE_ERROR', 503, true);
        this.name = 'AIServiceError';
        Object.setPrototypeOf(this, AIServiceError.prototype);
    }
}

export class AIConfigError extends AIError {
    constructor(message: string) {
        super(message, 'AI_CONFIG_ERROR', 500, false);
        this.name = 'AIConfigError';
        Object.setPrototypeOf(this, AIConfigError.prototype);
    }
}

/**
 * Error categorization helper
 */
export function categorizeError(error: unknown): AIError {
    if (error instanceof AIError) {
        return error;
    }

    if (error instanceof Error) {
        // Check for common error patterns
        const message = error.message.toLowerCase();

        if (message.includes('timeout') || message.includes('timed out')) {
            return new AITimeoutError(error.message);
        }

        if (message.includes('rate limit') || message.includes('quota')) {
            return new AIRateLimitError(error.message, 60);
        }

        if (message.includes('api key') || message.includes('unauthorized')) {
            return new AIConfigError('Invalid or missing API key');
        }

        if (message.includes('validation') || message.includes('invalid')) {
            return new AIValidationError(error.message, [error.message]);
        }

        // Default to service error
        return new AIServiceError(error.message, error);
    }

    // Unknown error type
    return new AIServiceError('An unknown error occurred', error);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof AIError) {
        return error.retryable;
    }
    return false;
}

/**
 * Get user-friendly error message (in Spanish)
 */
export function getUserFriendlyMessage(error: AIError): string {
    switch (error.code) {
        case 'AI_VALIDATION_ERROR':
            return 'La respuesta de la IA no es válida. Por favor, intenta de nuevo.';
        case 'AI_RATE_LIMIT':
            return 'Has excedido el límite de solicitudes. Por favor, espera un momento.';
        case 'AI_TIMEOUT':
            return 'La solicitud tardó demasiado. Por favor, intenta de nuevo.';
        case 'AI_SECURITY':
            const secError = error as AISecurityError;
            if (secError.reason === 'prompt_injection') {
                return 'Detectamos un intento de manipulación del sistema. Por favor, usa instrucciones válidas.';
            }
            return 'Contenido no válido o inseguro detectado.';
        case 'AI_SERVICE_ERROR':
            return 'Error al comunicarse con el servicio de IA. Por favor, intenta más tarde.';
        case 'AI_CONFIG_ERROR':
            return 'Error de configuración. Por favor, contacta al administrador.';
        default:
            return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    }
}
