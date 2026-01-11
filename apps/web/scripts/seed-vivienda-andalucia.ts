import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Dev/DOCNEX AI/DOCNEX_INICIO/.env.local' });

// Usando las claves locales detectadas vía "supabase status" para asegurar la ejecución
const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const supabase = createClient(supabaseUrl, supabaseKey);

const HOUSING_LAW = [
    {
        title: "Ley 6/2024, de Vivienda de Andalucía (LEYVIV)",
        kind: "pdf",
        theme: "Vivienda",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/boja/2024/248/1",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2024-12-18",
            area: "Vivienda",
            summary: "Nueva ley marco de vivienda en Andalucía. Nota: Aunque ya está publicada, su entrada en vigor plena y despliegue reglamentario es progresivo durante 2025. Sustituye y actualiza el régimen anterior de vivienda protegida y suelo residencial."
        },
        tags: ["LEYVIV", "Vivienda", "Andalucía", "Fundamental", "2024"]
    }
];

const GLOBAL_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

async function seedHousingLaw() {
    console.log("🏠 Indexando Nueva Ley de Vivienda de Andalucía (LEYVIV)...");

    for (const law of HOUSING_LAW) {
        const { data: existing } = await supabase
            .from('resources')
            .select('id')
            .eq('title', law.title)
            .eq('project_id', GLOBAL_PROJECT_ID)
            .maybeSingle();

        if (existing) {
            console.log(`ℹ️  ${law.title} ya existe, actualizando...`);
            const { error } = await supabase
                .from('resources')
                .update({
                    kind: law.kind,
                    theme: law.theme,
                    status: law.status,
                    source_uri: law.source_uri,
                    meta: law.meta,
                    tags: law.tags
                })
                .eq('id', existing.id);

            if (error) console.error(`❌ Error al actualizar ${law.title}:`, error);
            else console.log(`✅ ${law.title} actualizada.`);
        } else {
            const { error } = await supabase
                .from('resources')
                .insert([
                    {
                        ...law,
                        project_id: GLOBAL_PROJECT_ID
                    }
                ]);

            if (error) {
                console.error(`❌ Error al subir ${law.title}:`, error);
            } else {
                console.log(`✅ ${law.title} indexada exitosamente.`);
            }
        }
    }

    console.log("\n✨ Proceso de actualización de vivienda completado.");
}

seedHousingLaw().catch(console.error);
