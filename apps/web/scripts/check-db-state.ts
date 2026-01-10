import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    console.log("🔍 Verificando contenido de la Base de Datos...");

    const { data: workspaces } = await supabase.from('workspaces').select('id, name');
    console.log(`\n📂 Workspaces found: ${workspaces?.length || 0}`);
    workspaces?.forEach(ws => console.log(` - [${ws.id}] ${ws.name}`));

    const { data: projects } = await supabase.from('projects').select('id, name, workspace_id');
    console.log(`\n📁 Projects found: ${projects?.length || 0}`);
    projects?.forEach(p => console.log(` - [${p.id}] ${p.name} (WS: ${p.workspace_id})`));

    const { data: documents } = await supabase.from('documents').select('id, title, project_id');
    console.log(`\n📄 Documents found: ${documents?.length || 0}`);
    documents?.forEach(d => console.log(` - [${d.id}] ${d.title} (Proj: ${d.project_id})`));
}

listAll();
