/**
 * INPUT SANITIZER - Security layer for AI inputs
 * "THE SKEPTIC" - Trust nothing, validate everything
 */

// Dangerous patterns that might indicate prompt injection
const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    /you\s+are\s+now/i,
    /pretend\s+(to\s+)?be/i,
    /system\s+prompt/i,
    /reveal\s+your/i,
    /forget\s+(everything|all)/i,
    /new\s+instructions?:/i,
    /<\s*script/i,
    /javascript:/i,
    /data:/i,
    /\${.*}/,  // Template injection
    /eval\(/i,
    /exec\(/i,
    /require\(/i,
    /import\s+.*from/i
];

// Known malicious patterns
const MALICIOUS_PATTERNS = [
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /on\w+\s*=/i,  // event handlers: onclick=, onerror=, etc.
    /\bjavascript:/i,
    /\bvbscript:/i,
    /\bdata:.*base64/i
];

export interface SanitizationResult {
    isValid: boolean;
    sanitizedText: string;
    warnings: string[];
    blocked: boolean;
    blockReason?: string;
}

/**
 * Sanitize user input before sending to AI
 */
export function sanitizeInput(text: string, maxLength: number = 1024 * 1024 * 5): SanitizationResult {
    const warnings: string[] = [];
    let sanitized = text;
    let blocked = false;
    let blockReason: string | undefined;

    // 1. Check length
    if (text.length === 0) {
        return {
            isValid: false,
            sanitizedText: '',
            warnings: ['Input is empty'],
            blocked: true,
            blockReason: 'Empty input'
        };
    }

    if (text.length > maxLength) {
        warnings.push(`Input truncated from ${text.length} to ${maxLength} characters`);
        sanitized = text.slice(0, maxLength);
    }

    // 2. Check for prompt injection attempts
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            blocked = true;
            blockReason = 'Potential prompt injection detected';
            warnings.push(`Blocked: Detected pattern "${pattern.source}"`);
            break;
        }
    }

    // 3. Check for malicious code
    if (!blocked) {
        for (const pattern of MALICIOUS_PATTERNS) {
            if (pattern.test(text)) {
                blocked = true;
                blockReason = 'Malicious pattern detected';
                warnings.push(`Blocked: Detected malicious code pattern "${pattern.source}"`);
                break;
            }
        }
    }

    // 4. Remove null bytes (can cause parsing issues)
    sanitized = sanitized.replace(/\0/g, '');

    // 5. Normalize whitespace (but preserve newlines for document structure)
    sanitized = sanitized.replace(/\r\n/g, '\n');
    sanitized = sanitized.replace(/\r/g, '\n');

    // 6. Remove invisible unicode characters (except spaces and newlines)
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    return {
        isValid: !blocked,
        sanitizedText: sanitized,
        warnings,
        blocked,
        blockReason
    };
}

/**
 * Validate file upload
 */
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    fileInfo?: {
        name: string;
        size: number;
        type: string;
    };
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
];

export function validateFileUpload(file: File): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size === 0) {
        errors.push('File is empty');
    }

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB (max: 100MB)`);
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`Unsupported file type: ${file.type}`);
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'txt', 'docx', 'doc'];
    if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`Unsupported file extension: .${extension}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        fileInfo: errors.length === 0 ? {
            name: file.name,
            size: file.size,
            type: file.type
        } : undefined
    };
}

/**
 * Sanitize AI response before using it
 */
export function sanitizeAIResponse(response: string): string {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    // Try to extract JSON if wrapped in text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    return cleaned;
}

/**
 * Rate limiting check (client-side basic implementation)
 */
interface RateLimitState {
    count: number;
    resetTime: number;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export class RateLimiter {
    private state: RateLimitState = {
        count: 0,
        resetTime: Date.now() + RATE_LIMIT_WINDOW
    };

    canMakeRequest(): boolean {
        const now = Date.now();

        // Reset if window expired
        if (now >= this.state.resetTime) {
            this.state.count = 0;
            this.state.resetTime = now + RATE_LIMIT_WINDOW;
        }

        // Check limit
        if (this.state.count >= MAX_REQUESTS_PER_WINDOW) {
            return false;
        }

        this.state.count++;
        return true;
    }

    getRemainingRequests(): number {
        const now = Date.now();
        if (now >= this.state.resetTime) {
            return MAX_REQUESTS_PER_WINDOW;
        }
        return MAX_REQUESTS_PER_WINDOW - this.state.count;
    }

    getTimeUntilReset(): number {
        const now = Date.now();
        return Math.max(0, this.state.resetTime - now);
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
