/**
 * Simula la extracción de palabras clave mediante IA (Heurística simple)
 * STRICT ISOLATION: This logic runs purely on the provided 'content' string. 
 * It DOES NOT access any global state, database, or other blocks.
 * This ensures perfect isolation between documents/projects.
 */
export function extractKeywords(content: string): string[] {
    if (!content) return [];

    // Listado de Stop Words en Español (Extendido)
    const ignoredWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u',
        'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en',
        'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'so',
        'sobre', 'tras', 'versus', 'vía',
        'que', 'quien', 'donde', 'como', 'cuando', 'cual', 'cuyo',
        'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
        'aquella', 'aquellos', 'aquellas', 'esto', 'eso', 'aquello',
        'mi', 'tu', 'su', 'mis', 'tus', 'sus', 'nuestro', 'nuestra',
        'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'la',
        'ser', 'es', 'soy', 'eres', 'somos', 'son', 'fue', 'fueron', 'era', 'eramos',
        'estar', 'estoy', 'estas', 'esta', 'estamos', 'estan',
        'haber', 'he', 'has', 'ha', 'hemos', 'han', 'hay',
        'tener', 'tengo', 'tienes', 'tiene', 'tenemos', 'tienen',
        'hacer', 'hago', 'haces', 'hace', 'hacemos', 'hacen',
        'ir', 'voy', 'vas', 'va', 'vamos', 'van',
        'pero', 'mas', 'sino', 'aunque', 'porque', 'pues',
        'si', 'no', 'tambien', 'tampoco', 'muy', 'mas', 'menos',
        'todo', 'nada', 'algo', 'algun', 'alguno', 'alguna', 'ningun', 'ninguno', 'ninguna',
        'otro', 'otra', 'otros', 'otras'
    ]);

    const keywords = new Set<string>();

    // 1. Palabras Capitalizadas (Proper Nouns) no al inicio de frase o después de punto
    // Mejoramos regex para evitar falsos positivos
    const properNounRegex = /(?<!^|\.\s|\?|\!)\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g;
    const properNouns = content.match(properNounRegex);
    if (properNouns) {
        properNouns.forEach(w => {
            const cleanWord = w.toLowerCase().replace(/[.,;:()]/g, '');
            if (!ignoredWords.has(cleanWord) && cleanWord.length > 2) {
                // Remove duplicates with different casing
                const exists = Array.from(keywords).some(k => k.toLowerCase() === cleanWord);
                if (!exists) keywords.add(w); // Keep original casing
            }
        });
    }

    // 2. Palabras entre comillas
    const quotedRegex = /"([^"]+)"/g;
    let match;
    while ((match = quotedRegex.exec(content)) !== null) {
        if (match[1].length < 30 && match[1].length > 2) {
            const cleanQuote = match[1].replace(/[.,;:()]/g, '');
            if (!ignoredWords.has(cleanQuote.toLowerCase())) {
                keywords.add(match[1]);
            }
        }
    }

    // 3. Términos específicos detectados (Simulación de vocabulario técnico del proyecto)
    const technicalTerms = [
        'React', 'Next.js', 'Supabase', 'SQL', 'Database', 'Component', 'API', 'Frontend', 'Backend',
        'Typescript', 'Javascript', 'Node.js', 'HTML', 'CSS', 'Tailwind', 'PostgreSQL',
        'Auth', 'Storage', 'Realtime', 'Vector', 'Embedding', 'Semantic', 'AI', 'LLM'
    ];
    technicalTerms.forEach(term => {
        if (content.toLowerCase().includes(term.toLowerCase())) {
            keywords.add(term);
        }
    });

    return Array.from(keywords);
}
