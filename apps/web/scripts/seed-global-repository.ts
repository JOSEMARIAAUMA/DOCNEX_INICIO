import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedGlobalRepository() {
    console.log("📚 Poblando el Repositorio Normativo Global (Andalucía)...");

    const GLOBAL_NORMS = [
        {
            title: "LEY 7/2021 (LISTA) - LEY DE SUELO DE ANDALUCÍA",
            kind: 'other',
            meta: {
                area: "URBANISMO",
                range: "REGIONAL",
                compliance_type: "OBLIGATORY",
                jurisdiction: "Andalucía",
                version_date: "2021-12-01",
                summary: "Ley marco para la promoción de la sostenibilidad del territorio en Andalucía. Sustituye a la LOUA."
            }
        },
        {
            title: "DECRETO-LEY 1/2025 - MEDIDAS URGENTES VIVIENDA",
            kind: 'other',
            meta: {
                area: "URBANISMO",
                range: "REGIONAL",
                compliance_type: "OBLIGATORY",
                jurisdiction: "Andalucía",
                version_date: "2025-02-24",
                summary: "Medidas urgentes para el fomento de la vivienda asequible y simplificación de trámites urbanísticos."
            }
        },
        {
            title: "GUÍA DE DISEÑO BIOCLIMÁTICO EN EL SUR",
            kind: 'other',
            meta: {
                area: "URBANISMO",
                range: "REGIONAL",
                compliance_type: "RECOMMENDATION",
                jurisdiction: "Andalucía",
                version_date: "2023-05-10",
                summary: "Criterios técnicos para la mejora de la eficiencia energética en promociones residenciales mediterráneas."
            }
        }
    ];

    for (const norm of GLOBAL_NORMS) {
        // Find or create global resource (project_id is null)
        const { data: existing } = await supabase
            .from('resources')
            .select('id')
            .is('project_id', null)
            .eq('title', norm.title)
            .single();

        if (existing) {
            console.log(`♻️ Actualizando: ${norm.title}`);
            await supabase.from('resources').update({ meta: norm.meta }).eq('id', existing.id);
        } else {
            console.log(`🆕 Indexando: ${norm.title}`);
            await supabase.from('resources').insert([{
                project_id: null,
                title: norm.title,
                kind: norm.kind,
                meta: norm.meta,
                created_at: new Date().toISOString()
            }]);
        }
    }

    console.log("\n✅ Repositorio Global poblado con éxito.");
}

async function verifyAIKnowledge() {
    console.log("\n🤖 Verificando Conciencia de la IA...");
    // We would normally call AIService here via a test script, but for now we verify the seed.
    const { data: globalResources } = await supabase.from('resources').select('id, title').is('project_id', null);
    if (globalResources && globalResources.length >= 3) {
        console.log(`✨ Verificación exitosa: ${globalResources.length} recursos globales disponibles para todos los proyectos.`);
    } else {
        console.error("❌ Error: No se encontraron los recursos globales esperados.");
    }
}

seedGlobalRepository().then(verifyAIKnowledge).catch(console.error);
