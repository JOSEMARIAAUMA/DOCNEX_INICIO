import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSafe() {
    console.log("🌱 Iniciando Sembrado Seguro de Casos Reales...");

    const { data: { users } } = await supabase.auth.admin.listUsers();
    let user = users?.[0];
    if (!user) {
        const { data: newUser } = await supabase.auth.admin.createUser({
            email: 'admin@docnex.ai',
            password: 'password123',
            email_confirm: true
        });
        user = newUser.user!;
    }
    const userId = user.id;

    // 1. Workspace
    let { data: workspace } = await supabase.from('workspaces').select('*').limit(1).single();
    if (!workspace) {
        const { data: newWs } = await supabase.from('workspaces').insert([{ name: "Espacio de Trabajo Principal" }]).select().single();
        workspace = newWs;
    }

    const cases = [
        {
            name: "Bufete Jurídico: Demanda Civil NEX-88",
            title: "Demanda por Incumplimiento Contractual",
            blocks: [
                { title: "I. Encabezamiento y Partes", content: "Demanda presentada por Inmobiliaria Guadalquivir S.L. contra Construcciones Modernas S.A." },
                { title: "II. Hechos: Suscripción de Contrato", content: "Las partes suscribieron contrato de obra el 12/05/2025 para la promoción 'Hacienda Sur'." },
                { title: "III. Hechos: Incumplimiento de Plazos", content: "La cláusula 4 establecía entrega el 01/12/2025. Retraso actual: 25%." },
                { title: "IV. Fundamentos de Derecho", content: "Aplicación del Art. 1101 del Código Civil sobre negligencia y morosidad." },
                { title: "V. Suplico al Juzgado", content: "Se solicita resolución contractual e indemnización de 150.000€." }
            ],
            resources: [
                { title: "Código Civil Español Art. 1101", kind: "pdf" },
                { title: "Contrato de Obra Original 2025", kind: "pdf" }
            ],
            links: [
                { s: 2, t: 1, type: "amplía", reason: "Detalla el incumplimiento del contrato mencionado en el bloque 1." },
                { s: 3, t: 2, type: "requiere", reason: "El fundamento jurídico se basa en los hechos de retraso." }
            ]
        },
        {
            name: "Estudio Arquitectura: Eco-Torre Caleta",
            title: "Memoria de Sostenibilidad V4",
            blocks: [
                { title: "Resumen Ejecutivo", content: "Torre residencial de 14 plantas con certificación BREEAM Excellent." },
                { title: "Sistemas Pasivos: Fachada", content: "Fachada ventilada con piedra natural y orientación Levante." },
                { title: "Energías Renovables", content: "Paneles fotovoltaicos en cara sur y baterías de litio en sótano -2." },
                { title: "Cálculos de Estructura", content: "Hormigón con fibras recicladas H-450." }
            ],
            resources: [
                { title: "Normativa CTE-HE 2024", kind: "pdf" },
                { title: "Manual BREEAM Vivienda", kind: "pdf" }
            ],
            links: [
                { s: 1, t: 0, type: "amplía", reason: "Detalla los sistemas pasivos mencionados en el resumen." }
            ]
        },
        {
            name: "Tesis: Urbanismo Barroco en Andalucía",
            title: "Capítulo IV: La Plaza Mayor como Eje",
            blocks: [
                { title: "Introducción al Urbanismo Barroco", content: "Análisis de la persistencia del trazado barroco en Andalucía." },
                { title: "Estudio de Caso: Sevilla", content: "Comparativa entre las Plazas Mayores y los ensanches de Málaga." },
                { title: "Análisis: Alameda de Hércules", content: "Primer jardín público de Europa y su impacto contemporáneo." },
                { title: "Conclusiones del Capítulo", content: "El urbanismo barroco define la socialización andaluza actual." }
            ],
            resources: [
                { title: "Chueca Goitia - Historia del Urbanismo", kind: "pdf" },
                { title: "Plano de Olavide (1771)", kind: "image" }
            ],
            links: [
                { s: 2, t: 1, type: "cita", reason: "Utiliza Sevilla como base para el análisis de la Alameda." }
            ]
        }
    ];

    for (const c of cases) {
        console.log(`\n📂 Creando: ${c.name}`);
        const { data: project } = await supabase.from('projects').insert([{ name: c.name, workspace_id: workspace.id }]).select().single();
        const { data: doc } = await supabase.from('documents').insert([{ project_id: project.id, title: c.title, category: 'main' }]).select().single();

        const blocksToInsert = c.blocks.map((b, i) => ({
            document_id: doc.id,
            title: b.title,
            content: b.content,
            order_index: i,
            block_type: 'section'
        }));

        const { data: createdBlocks } = await supabase.from('document_blocks').insert(blocksToInsert).select('id').order('order_index', { ascending: true });

        if (c.links && createdBlocks) {
            const linksToInsert = c.links.map(l => ({
                source_block_id: createdBlocks[l.s].id,
                target_block_id: createdBlocks[l.t].id,
                target_document_id: doc.id,
                link_type: 'semantic_similarity',
                metadata: { reason: l.reason }
            }));
            await supabase.from('semantic_links').insert(linksToInsert);
        }

        const resourcesToInsert = c.resources.map(r => ({
            project_id: project.id,
            document_id: doc.id,
            title: r.title,
            kind: r.kind,
            meta: { status: 'verified' }
        }));
        await supabase.from('resources').insert(resourcesToInsert);
        console.log(`✅ Caso completado: ${createdBlocks?.length} bloques, ${c.resources.length} recursos.`);
    }

    console.log("\n✨ Sembrado completado sin errores de cuota.");
}

seedSafe();
