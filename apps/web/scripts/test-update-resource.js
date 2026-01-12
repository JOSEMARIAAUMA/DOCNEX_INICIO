
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdateResource() {
    console.log("Testing updateResource logic...");

    // Pick a resource to test
    const { data: res } = await supabase.from('resources').select('*').limit(1).single();
    if (!res) {
        console.log("No resources found to test.");
        return;
    }

    console.log(`Resource before update: ${res.title} | Theme: ${res.theme}`);

    const originalTheme = res.theme;
    const testTheme = "Urbanismo de Prueba " + Date.now();

    // Simulamos la lógica de updateResource de api.ts
    // En api.ts se espera un objeto con las propiedades a actualizar
    const { error } = await supabase
        .from('resources')
        .update({ theme: testTheme })
        .eq('id', res.id);

    if (error) {
        console.error("Update failed:", error);
    } else {
        const { data: updated } = await supabase.from('resources').select('*').eq('id', res.id).single();
        console.log(`Resource after update: ${updated.title} | Theme: ${updated.theme}`);

        if (updated.theme === testTheme) {
            console.log("SUCCESS: updateResource logic persistence verified.");
            // Restore
            await supabase.from('resources').update({ theme: originalTheme }).eq('id', res.id);
        } else {
            console.error("FAILURE: Theme was not updated in DB.");
        }
    }
}

testUpdateResource().catch(console.error);
