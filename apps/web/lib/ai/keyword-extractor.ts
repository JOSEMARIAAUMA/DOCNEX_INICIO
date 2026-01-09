/**
 * Simula la extracción de palabras clave mediante IA (Heurística simple)
 */
export function extractKeywords(content: string): string[] {
    if (!content) return [];

    const ignoredWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'o', 'que', 'en', 'con', 'por', 'para', 'es', 'son', 'se', 'lo', 'no', 'si', 'a', 'al']);
    const keywords = new Set<string>();

    // 1. Palabras Capitalizadas (Proper Nouns) no al inicio de frase o después de punto
    // Mejoramos regex para evitar falsos positivos
    const properNounRegex = /(?<!^|\.\s|\?|\!)\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g;
    const properNouns = content.match(properNounRegex);
    if (properNouns) {
        properNouns.forEach(w => {
            if (!ignoredWords.has(w.toLowerCase()) && w.length > 2) {
                keywords.add(w);
            }
        });
    }

    // 2. Palabras entre comillas
    const quotedRegex = /"([^"]+)"/g;
    let match;
    while ((match = quotedRegex.exec(content)) !== null) {
        if (match[1].length < 30 && match[1].length > 2) keywords.add(match[1]); // Solo frases cortas
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
