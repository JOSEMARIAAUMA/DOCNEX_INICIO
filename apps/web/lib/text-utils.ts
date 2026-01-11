/**
 * Simple utility to decode common HTML entities found in legal documents
 */
export function decodeHtmlEntities(text: string): string {
    if (!text) return '';
    return text.replace(/&([a-z0-9]+|#[0-9]+|#x[a-f0-9]+);/gi, (match) => {
        const entities: Record<string, string> = {
            '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
            '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
            '&ntilde;': 'ñ', '&Ntilde;': 'Ñ', '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>',
            '&apos;': "'", '&deg;': '°', '&bull;': '•', '&iquest;': '¿', '&iexcl;': '¡'
        };
        const lowerMatch = match.toLowerCase();
        return entities[lowerMatch] || match;
    });
}
