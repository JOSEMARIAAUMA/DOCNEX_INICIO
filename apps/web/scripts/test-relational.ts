import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

console.log("🔑 Verificando API Key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "CONFIGURADA" : "FALTA");

async function testRelational() {
    const { relationalAgent } = await import('../lib/ai/agents/relational-agent');

    console.log("🚀 TEST: AGENTE RELACIONAL (Arquitecto de Grafos)");
    console.log("-----------------------------------------------");

    const mockBlocks = [
        {
            title: "Cláusula 1: Definición de Software",
            content: "El Software se define como la plataforma DOCNEX en su versión 2.5, incluyendo todos sus módulos de IA.",
            target: "section" as any
        },
        {
            title: "Cláusula 5: Limitación de Responsabilidad",
            content: "La responsabilidad del proveedor se limita a 500€. Esta limitación no aplica si el Software definido en la Cláusula 1 presenta fallos críticos en el ADN cognitivo.",
            target: "section" as any
        },
        {
            title: "Anexo Técnico: Seguridad",
            content: "Se implementan protocolos de cifrado AES-256. Esto contradice la versión previa del contrato donde se permitía SSL básico.",
            target: "annex" as any
        }
    ];

    console.log("🧠 ANALIZANDO RELACIONES...");
    const links = await relationalAgent.discoverLinks(mockBlocks, "Contrato de servicios IA");

    console.log("\n✅ RELACIONES ENCONTRADAS:");
    links.forEach((link: any) => {
        const source = mockBlocks[link.source_index]?.title;
        const target = mockBlocks[link.target_index]?.title;
        console.log(`- [${link.type.toUpperCase()}] ${source} -> ${target}`);
        console.log(`  Motivo: ${link.reason}`);
    });
}

testRelational();
