import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ANDALUCIA_LAWS = [
    {
        title: "Ley 7/2021 (LISTA): Impulso para la Sostenibilidad del Territorio de Andalucía",
        kind: "pdf",
        theme: "Urbanismo",
        status: "ACTIVE",
        source_uri: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-540",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2021-12-01",
            area: "Urbanismo",
            summary: "Ley marco que simplifica y unifica la normativa urbanística y territorial en Andalucía."
        },
        tags: ["LISTA", "Urbanismo", "Sostenibilidad", "Fundamental"]
    },
    {
        title: "Reglamento General de la LISTA (Decreto 550/2022)",
        kind: "pdf",
        theme: "Urbanismo",
        status: "ACTIVE",
        source_uri: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-19253",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2022-11-29",
            area: "Urbanismo",
            summary: "Reglamento que desarrolla la LISTA, detallando procedimientos de planeamiento y gestión."
        },
        tags: ["RGLISTA", "Reglamento", "Procedimiento", "Gestión"]
    },
    {
        title: "Decreto-ley 1/2025: Medidas urgentes para la Vivienda en Andalucía",
        kind: "pdf",
        theme: "Vivienda",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/boja/2025/1/1",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2025-01-08",
            area: "Vivienda",
            summary: "Medidas para fomentar la vivienda asequible y agilizar la transformación de suelos."
        },
        tags: ["Vivienda", "Urgente", "2025", "Suelo"]
    },
    {
        title: "Decreto-ley 3/2024: Simplificación Administrativa",
        kind: "pdf",
        theme: "Administrativo",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/boja/2024/31/1",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2024-02-16",
            area: "Administrativo",
            summary: "Reforma masiva para reducir trabas burocráticas en urbanismo y medio ambiente."
        },
        tags: ["Simplificación", "Burocracia", "Urbanismo", "Ambiental"]
    },
    {
        title: "Orden de Vivienda de 2008 (Normas Técnicas)",
        kind: "pdf",
        theme: "Vivienda",
        status: "VETOED",
        veto_reason: "Derogada y sustituida por la Orden de 2020.",
        source_uri: "https://www.juntadeandalucia.es/boja/2008/150/1",
        meta: {
            range: "REGIONAL",
            compliance_type: "REFERENCE",
            jurisdiction: "Andalucía",
            version_date: "2008-07-01",
            area: "Vivienda",
            summary: "Antiguas normas técnicas de diseño y calidad de vivienda protegida."
        },
        tags: ["Obsoleto", "Histórico", "Vivienda_2008"]
    },
    {
        title: "Orden de Vivienda de 2020: Diseño y Calidad",
        kind: "pdf",
        theme: "Vivienda",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/boja/2020/120/1",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2020-06-15",
            area: "Vivienda",
            summary: "Normas vigentes sobre condiciones mínimas de diseño y calidad en la edificación."
        },
        tags: ["Vivienda", "Diseño", "Calidad", "Vigente"]
    },
    {
        title: "Ley GICA: Gestión Integrada de la Calidad Ambiental",
        kind: "pdf",
        theme: "Medio Ambiente",
        status: "ACTIVE",
        source_uri: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-16062",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2007-07-09",
            area: "Medio Ambiente",
            summary: "Marco ambiental para autorizaciones, evaluaciones de impacto y control de calidad."
        },
        tags: ["GICA", "Ambiental", "Evaluación", "Impacto"]
    },
    {
        title: "Plan Vive en Andalucía 2020-2030",
        kind: "pdf",
        theme: "Vivienda",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/viviendayconsumo/vivienda/plan-vive",
        meta: {
            range: "REGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2020-12-01",
            area: "Vivienda",
            summary: "Estrategia decenal para el fomento de la vivienda y la rehabilitación urbana."
        },
        tags: ["Plan_Vive", "Estrategia", "2030", "Rehabilitación"]
    },
    {
        title: "Plan de Ordenación del Territorio del Campo de Gibraltar (POTCG)",
        kind: "pdf",
        theme: "Ordenación Territorio",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/organismos/fomentoarticulacionterritoriovivienda/areas/ordenacion-territorio/planes-territoriales/paginas/pot-campo-gibraltar.html",
        meta: {
            range: "SUBREGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2013-01-01",
            area: "Ordenación Territorio",
            summary: "Directrices de ordenación para el ámbito del Campo de Gibraltar."
        },
        tags: ["POTCG", "Campo_Gibraltar", "Territorio", "Subregional"]
    },
    {
        title: "Plan de Ordenación del Territorio de la Costa Noroeste (POTCN)",
        kind: "pdf",
        theme: "Ordenación Territorio",
        status: "ACTIVE",
        source_uri: "https://www.juntadeandalucia.es/organismos/fomentoarticulacionterritoriovivienda/areas/ordenacion-territorio/planes-territoriales/paginas/pot-costa-noroeste.html",
        meta: {
            range: "SUBREGIONAL",
            compliance_type: "OBLIGATORY",
            jurisdiction: "Andalucía",
            version_date: "2011-01-01",
            area: "Ordenación Territorio",
            summary: "Estrategia territorial para la Costa Noroeste de Cádiz."
        },
        tags: ["POTCN", "Costa_Noroeste", "Territorio", "Subregional"]
    }
];

async function seedGlobalAndalucia() {
    console.log("📚 Poblando Estanterías Maestras: Urbanismo Andalucía...");

    for (const law of ANDALUCIA_LAWS) {
        // First check if it exists by title in the global repository (project_id is null)
        const { data: existing } = await supabase
            .from('resources')
            .select('id')
            .eq('title', law.title)
            .is('project_id', null)
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
            else console.log(`✅ [${law.status}] ${law.title} actualizada.`);
        } else {
            const { error } = await supabase
                .from('resources')
                .insert([
                    {
                        title: law.title,
                        kind: law.kind,
                        theme: law.theme,
                        status: law.status,
                        source_uri: law.source_uri,
                        meta: law.meta,
                        tags: law.tags,
                        project_id: null
                    }
                ]);

            if (error) {
                console.error(`❌ Error al subir ${law.title}:`, error);
            } else {
                console.log(`✅ [${law.status}] ${law.title} indexada.`);
            }
        }
    }

    console.log("\n✨ Biblioteca Urbana de Andalucía actualizada y supervisada.");
}

seedGlobalAndalucia().catch(console.error);
