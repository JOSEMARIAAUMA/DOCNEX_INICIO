import * as dotenv from 'dotenv';
import path from 'path';

// Cargar desde el directorio actual de ejecución (asumiendo que se corre desde el root o apps/web)
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

console.log("🔑 Verificando API Key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "CONFIGURADA" : "FALTA");

async function stressTest() {
    const { LibrarianAgent } = await import('../lib/ai/agents/librarian-agent');
    console.log("🚀 INICIANDO PRUEBA DE ESTRÉS: AGENTE BIBLIOTECARIO (DOCNEX)");
    console.log("----------------------------------------------------------------");

    const complexLegalText = `
CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS Y LICENCIAMIENTO DE SOFTWARE (DOCNEX v2.5)

Este contrato se celebra entre DOCNEX CORP (en adelante, EL PROVEEDOR) y el USUARIO FINAL (en adelante, EL LICENCIATARIO).

1. DEFINICIONES
1.1 "Software" se refiere a la plataforma DOCNEX.
1.2 "Agentes" se refiere a las entidades cognitivas integradas.

II. OBJETO DEL CONTRATO
El LICENCIATARIO adquiere una licencia no exclusiva. 
Nota importante: El uso está limitado a 5 agentes concurrentes según el Plan Maestro.

ARTÍCULO TERCERO: RESPONSABILIDAD Y GARANTÍAS
3.1. EL PROVEEDOR garantiza el 99.9% de Uptime.
3.2. Limitación de responsabilidad: En ningún caso EL PROVEEDOR será responsable por daños indirectos.
Excepción a la 3.2: Salvo en casos de negligencia grave comprobada en el manejo de la Memoria Central.

ANEXO A - ESPECIFICACIONES TÉCNICAS
- GraphRAG habilitado.
- Soporte para Tiptap v3.
- Protocolo MCP implementado.

TERMINOS ADICIONALES (Sección sin numerar)
Cualquier disputa se resolverá en los tribunales de la Ciudad de la IA.
    `;

    const agent = new LibrarianAgent();

    console.log("📦 INPUT: Documento Legal con estructura inconsistente (Números romanos, cardinales y etiquetas 'Anexo').");
    console.log("🧠 PROCESANDO...");

    try {
        const result = await agent.structureDocument(complexLegalText, "Prefiero que los Anexos sean bloques independientes y que el Artículo Tercero tenga sus sub-apartados (3.1, 3.2) como hijos.");

        console.log("\n✅ RESULTADO DEL BIBLIOTECARIO (Tras pasar por Autocrítica):");
        console.log(JSON.stringify(result, null, 2));

        if (result.length > 0) {
            console.log(`\n📊 ANÁLISIS DE ÉXITO:`);
            console.log(`- Bloques detectados: ${result.length}`);
            const hasAnexoAsBlock = result.some(b => b.title.toLowerCase().includes('anexo'));
            const hasNestedHijos = result.some(b => b.children && b.children.length > 0);

            console.log(`- ¿Separó el Anexo?: ${hasAnexoAsBlock ? 'SÍ' : 'NO'}`);
            console.log(`- ¿Detectó jerarquía (hijos)?: ${hasNestedHijos ? 'SÍ' : 'NO'}`);
        }

    } catch (error) {
        console.error("❌ ERROR EN LA PRUEBA:", error);
    }
}

stressTest();
