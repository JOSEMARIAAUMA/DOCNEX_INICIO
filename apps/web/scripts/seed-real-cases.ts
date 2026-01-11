import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUseCases() {
    console.log("🌱 Iniciando Sembrado de Casos de Uso Reales...");

    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) {
        console.error("❌ Error listando usuarios:", uError);
        return;
    }

    let user = users?.[0];
    if (!user) {
        const { data: newUser, error: cError } = await supabase.auth.admin.createUser({
            email: 'test@docnex.ai',
            password: 'password123',
            email_confirm: true
        });
        if (cError) return console.error("❌ Error creando usuario:", cError);
        user = newUser.user!;
    }
    const userId = user.id;

    // 1. Asegurar un Workspace
    let { data: workspace } = await supabase.from('workspaces').select('*').limit(1).single();
    if (!workspace) {
        const { data: newWs, error: wsError } = await supabase.from('workspaces').insert([{ name: "Mi Espacio de Trabajo" }]).select().single();
        if (wsError) return console.error("❌ Error creando workspace:", wsError);
        workspace = newWs;
    }
    console.log(`🏢 Usando Workspace: ${workspace.name}`);

    const { librarianAgent } = await import('../lib/ai/agents/librarian-agent');
    const { relationalAgent } = await import('../lib/ai/agents/relational-agent');

    const cases = [
        {
            name: "Bufete Jurídico: Caso Civil #88/2026",
            title: "Demanda por Incumplimiento Contractual - Ref. NEX-LAW-01",
            content: `DEMANDA DE JUICIO ORDINARIO POR INCUMPLIMIENTO CONTRACTUAL
A LA ATENCIÓN DEL JUZGADO DE PRIMERA INSTANCIA DE SEVILLA

PARTE DEMANDANTE: Inmobiliaria Guadalquivir S.L.
PARTE DEMANDADA: Construcciones Modernas S.A.

HECHOS:
1. Las partes suscribieron contrato de obra el 12/05/2025.
2. La cláusula 4 establecía la entrega de llaves para el 01/12/2025.
3. A fecha de hoy, la obra presenta un retraso del 25% según informe pericial adjunto.

FUNDAMENTOS DE DERECHO:
I. Capacidad de las partes.
II. Legitimación.
III. Jurisdicción y Competencia.
IV. Fondo del asunto: Civil 1101 y ss sobre morosidad contractual.

PETICIÓN: Se solicita la resolución del contrato y una indemnización de 150.000€ por daños y perjuicios.`,
            bibliography: [
                { title: "Código Civil Español - Art. 1101", kind: "pdf" },
                { title: "Sentencia TS 456/2023 sobre retrasos en obra", kind: "pdf" },
                { title: "Informe Pericial Estado de Obra V2", kind: "docx" }
            ]
        },
        {
            name: "Estudio Arquitectura: Proyecto 'Eco-Torre Caleta'",
            title: "Memoria Técnica de Sostenibilidad y Eficiencia Energética",
            content: `MEMORIA TÉCNICA SUSTENTABLE - PROYECTO ECO-TORRE CALETA (CÁDIZ)
==================================================================

1. RESUMEN EJECUTIVO
El proyecto consiste en una torre residencial de 14 plantas con certificación BREEAM Excellent.

2. SISTEMAS PASIVOS
Uso de fachada ventilada con panel de piedra natural. Orientación óptima para aprovechar los vientos de Levante.
El diseño contradice la normativa municipal de 1998 sobre huecos de fachada, pero se acoge a la nueva ley de eficiencia 2024.

3. INSTALACIONES DE ENERGÍA RENOVABLE
Integración de paneles fotovoltaicos transparentes en los cristales de la cara sur.
Baterías de litio de última generación situadas en el sótano -2 por seguridad térmica.

4. CÁLCULOS ESTRUCTURALES
Uso de hormigón con fibras recicladas. Resistencia estimada: 450 kg/cm2.`,
            bibliography: [
                { title: "Normativa CTE-HE 2024", kind: "pdf" },
                { title: "Informe de Vientos Bahía de Cádiz", kind: "pdf" },
                { title: "Detalle Constructivo Fachada Ventilada", kind: "docx" }
            ]
        },
        {
            name: "Tesis Doctoral: Urbanismo en Andalucía",
            title: "Capítulo IV: La Huella del Urbanismo Barroco en las Capitales Andaluzas",
            content: `TESIS DOCTORAL: LA EVOLUCIÓN DEL ESPACIO PÚBLICO EN ANDALUCÍA (1700-2026)
CAPÍTULO IV: EL MODELO BARROCO Y SU IMPACTO EN LA SEVILLA DEL SIGLO XXI

INTRODUCCIÓN AL CAPÍTULO
El análisis de las plazas mayores en Andalucía revela una persistencia del trazado barroco como eje de socialización.
Sevilla actúa como caso de estudio principal, comparándola con los ensanches decimonónicos de Málaga.

EL CASO DE LA ALAMEDA DE HÉRCULES
La Alameda representa el primer jardín público de Europa. Su influencia se extiende hasta el urbanismo contemporáneo de 'supermanzanas'.
Contradice la tesis de Valenzuela (2005) sobre la degradación del espacio central sevillano.

BIBLIOGRAFÍA COGNITIVA
- Chueca Goitia, F. (1968). Breve historia del urbanismo.
- Valenzuela, A. (2005). El espacio público en la ciudad andaluza.
- Plan General de Ordenación Urbana de Sevilla (PGOU 2006).`,
            bibliography: [
                { title: "Valenzuela (2005) - Espacio Público Andaluz", kind: "pdf" },
                { title: "Chueca Goitia - Historia del Urbanismo", kind: "pdf" },
                { title: "PGOU Sevilla 2006 corregido", kind: "pdf" },
                { title: "Mapas Históricos Archivo de Indias", kind: "url" }
            ]
        }
    ];

    for (const c of cases) {
        console.log(`\n🚀 Procesando caso: ${c.name}`);

        const { data: project, error: pError } = await supabase
            .from('projects')
            .insert([{ name: c.name, workspace_id: workspace.id, description: `Caso generado automáticamente para test de ${c.name}` }])
            .select()
            .single();

        if (pError) {
            console.error(`Error creando proyecto ${c.name}:`, pError);
            continue;
        }

        const { data: doc, error: dError } = await supabase
            .from('documents')
            .insert([{ project_id: project.id, title: c.title, category: 'main' }])
            .select()
            .single();

        if (dError) {
            console.error(`Error creando documento ${c.title}:`, dError);
            continue;
        }

        console.log(`🧠 Ejecutando IA para segmentación y grafos...`);
        const blockItems = await librarianAgent.structureDocument(c.content, "Estructura profesional por secciones.");
        const linkItems = await relationalAgent.discoverLinks(blockItems, c.title);

        console.log(`📦 Importando ${blockItems.length} bloques y ${linkItems.length} vínculos...`);

        const blocksToInsert = blockItems.map((b, index) => ({
            document_id: doc.id,
            title: b.title,
            content: b.content,
            order_index: index,
            tags: [],
            block_type: b.target || 'text',
            is_deleted: false
        }));

        const { data: createdBlocks, error: blockError } = await supabase
            .from('document_blocks')
            .insert(blocksToInsert)
            .select('id, title')
            .order('order_index', { ascending: true });

        if (blockError || !createdBlocks) {
            console.error("Error creating blocks:", blockError);
            continue;
        }

        const linksToInsert = linkItems.map((link: any) => {
            const sourceBlock = createdBlocks[link.source_index];
            const targetBlock = createdBlocks[link.target_index];
            if (!sourceBlock || !targetBlock) return null;
            return {
                source_block_id: sourceBlock.id,
                target_block_id: targetBlock.id,
                target_document_id: doc.id,
                link_type: 'semantic_similarity',
                metadata: { reason: link.reason, confidence: 0.8 }
            };
        }).filter(Boolean);

        if (linksToInsert.length > 0) {
            await supabase.from('semantic_links').insert(linksToInsert);
        }

        console.log(`📚 Sembrando bibliografía (${c.bibliography.length} recursos)...`);
        const resourcesToInsert = c.bibliography.map(b => ({
            project_id: project.id,
            document_id: doc.id,
            title: b.title,
            kind: b.kind,
            meta: { author: "IA Gen", year: 2026, status: 'verified' }
        }));

        await supabase.from('resources').insert(resourcesToInsert);
    }

    console.log("\n✨ ¡Sembrado completado con éxito! DOCNEX ya no está vacío.");
}

seedUseCases();
