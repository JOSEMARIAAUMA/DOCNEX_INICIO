import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log("🧪 Testeando función de borrado...");

    // 1. Get a block
    const { data: blocks } = await supabase.from('document_blocks').select('*').limit(1);
    if (!blocks || blocks.length === 0) {
        console.log("❌ No hay bloques para borrar.");
        return;
    }

    const blockId = blocks[0].id;
    console.log(`🗑️ Intentando borrar bloque: ${blockId}`);

    const { error } = await supabase
        .from('document_blocks')
        .update({ is_deleted: true })
        .eq('id', blockId);

    if (error) {
        console.error("❌ ERROR AL BORRAR:", error);
    } else {
        console.log("✅ Borrado exitoso en DB.");

        // Check if it's still visible to listActiveBlocks logic
        const { data: activeBlocks } = await supabase
            .from('document_blocks')
            .select('id')
            .eq('id', blockId)
            .eq('is_deleted', false);

        if (activeBlocks && activeBlocks.length > 0) {
            console.error("❌ FALLO: El bloque sigue apareciendo como activo.");
        } else {
            console.log("✅ VERIFICADO: El bloque ya no es activo.");
        }
    }
}

testDelete();
