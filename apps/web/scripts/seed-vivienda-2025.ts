import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_LAW = {
    title: "Ley 5/2025, de 16 de diciembre, de Vivienda de Andalucía",
    kind: "pdf",
    theme: "Vivienda",
    status: "ACTIVE",
    source_uri: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-423",
    meta: {
        range: "REGIONAL",
        compliance_type: "OBLIGATORY",
        jurisdiction: "Andalucía",
        version_date: "2025-12-16",
        area: "Vivienda",
        summary: "Ley integral de vivienda de Andalucía que regula el acceso, la calidad y la gestión del parque habitacional público y privado."
    },
    tags: ["Vivienda", "Andalucía", "2025", "Ley", "Derecho a la Vivienda"]
};

async function seedViviendaLaw() {
    console.log("🚀 Indexando Nueva Ley de Vivienda 5/2025...");

    const { data: existing } = await supabase
        .from('resources')
        .select('id')
        .eq('title', NEW_LAW.title)
        .is('project_id', null)
        .maybeSingle();

    if (existing) {
        console.log(`ℹ️  La ley ya existe, actualizando metadatos...`);
        const { error } = await supabase
            .from('resources')
            .update({
                kind: NEW_LAW.kind,
                theme: NEW_LAW.theme,
                status: NEW_LAW.status,
                source_uri: NEW_LAW.source_uri,
                meta: NEW_LAW.meta,
                tags: NEW_LAW.tags
            })
            .eq('id', existing.id);

        if (error) console.error(`❌ Error:`, error);
        else console.log(`✅ Ley actualizada.`);
    } else {
        const { error } = await supabase
            .from('resources')
            .insert([
                {
                    ...NEW_LAW,
                    project_id: null
                }
            ]);

        if (error) {
            console.error(`❌ Error al insertar:`, error);
        } else {
            console.log(`✅ Ley 5/2025 indexada correctamente.`);
        }
    }
}

seedViviendaLaw().catch(console.error);
