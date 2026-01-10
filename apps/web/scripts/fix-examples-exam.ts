import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log("🛠️ Reestructurando datos para Workspace EXAM...");

    // 1. Crear workspace EXAM si no existe
    let { data: examWs } = await supabase.from('workspaces').select('*').eq('name', 'EXAM').single();

    if (!examWs) {
        const { data, error } = await supabase.from('workspaces').insert([{ name: 'EXAM' }]).select().single();
        if (error) throw error;
        examWs = data;
        console.log(`✅ Workspace EXAM creado: ${examWs.id}`);
    } else {
        console.log(`ℹ️ Workspace EXAM ya existe: ${examWs.id}`);
    }

    // 2. Mover casos de ejemplo a EXAM
    const examples = ['Eco-Torre', 'Bufete', 'Urbanismo', 'Demanda', 'Memoria', 'Capítulo'];

    const { data: projects } = await supabase.from('projects').select('*');
    if (projects) {
        for (const p of projects) {
            const isExample = examples.some(ex => p.name.includes(ex));
            if (isExample) {
                console.log(`📦 Moviendo proyecto "${p.name}" a EXAM...`);
                await supabase.from('projects').update({ workspace_id: examWs.id }).eq('id', p.id);
            }
        }
    }

    console.log("\n🚀 Operación completada. Todos los ejemplos deberían estar bajo EXAM.");
}

fixData().catch(console.error);
