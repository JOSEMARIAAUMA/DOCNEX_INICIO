import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedExam() {
    console.log("🚀 Seeding EXAM Workspace with real projects...");

    // 1. Ensure EXAM workspace exists
    let { data: examWs } = await supabase.from('workspaces').select('*').eq('name', 'EXAM').single();
    if (!examWs) {
        const { data, error } = await supabase.from('workspaces').insert([{ name: 'EXAM' }]).select().single();
        if (error) throw error;
        examWs = data;
        console.log(`✅ Created EXAM workspace: ${examWs.id}`);
    }

    const projects = [
        {
            name: "Bufete Jurídico: Demanda NEX-88",
            description: "Caso civil contra Constructora Guadalquivir por vicios ocultos y retraso en entrega.",
            docs: ["Escrito de Demanda", "Dictamen Pericial", "Contrato de Arras"]
        },
        {
            name: "Arquitectura: Eco-Torre Caleta",
            description: "Proyecto de torre bioclimática con certificación LEED Platinum en zona litoral.",
            docs: ["Memoria de Proyecto", "Cálculos Estructurales", "Planos de Planta"]
        },
        {
            name: "Academia: Urbanismo Barroco",
            description: "Estudio comparativo sobre la influencia del trazado barroco en las ciudades andaluzas.",
            docs: ["Tesis Doctoral", "Análisis de Cartografía", "Bibliografía Comentada"]
        }
    ];

    for (const p of projects) {
        // Check if project exists
        const { data: existing } = await supabase.from('projects').select('*').eq('name', p.name).eq('workspace_id', examWs.id).single();
        if (existing) {
            console.log(`ℹ️ Project ${p.name} already exists.`);
            continue;
        }

        const { data: newProj, error: pErr } = await supabase.from('projects').insert([{
            name: p.name,
            description: p.description,
            workspace_id: examWs.id
        }]).select().single();

        if (pErr) {
            console.error(`Error creating project ${p.name}:`, pErr);
            continue;
        }

        console.log(`✅ Created project: ${p.name}`);

        for (const docTitle of p.docs) {
            await supabase.from('documents').insert([{
                project_id: newProj.id,
                title: docTitle,
                status: 'draft'
            }]);
        }
        console.log(`   - Added ${p.docs.length} documents.`);
    }

    console.log("✨ EXAM Workspace seeding completed.");
}

seedExam().catch(console.error);
