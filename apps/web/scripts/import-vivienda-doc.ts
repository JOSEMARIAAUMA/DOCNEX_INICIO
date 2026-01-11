import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importViviendaAsDocument() {
    console.log("📄 Creando Documento Estructurado para Ley 5/2025...");

    // 1. Get a project_id (for global docs, we might need a dummy project or allow project_id to be null)
    // Based on schema, documents.project_id is NOT NULL. 
    // We'll use the first project found.
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    const projectId = projects?.[0]?.id;

    if (!projectId) {
        console.error("❌ No se encontró ningún proyecto para asociar el documento.");
        return;
    }

    // 2. Create the document
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert([{
            project_id: projectId,
            title: "Ley 5/2025 de Vivienda de Andalucía",
            category: "main",
            status: "draft",
            description: "Texto consolidado de la Ley 5/2025 de Vivienda de Andalucía."
        }])
        .select()
        .single();

    if (docError || !doc) {
        console.error("❌ Error al crear documento:", docError);
        return;
    }

    console.log(`✅ Documento creado con ID: ${doc.id}`);

    // 3. Create blocks
    const blocks = [
        {
            title: "Preámbulo",
            content: "La presente Ley tiene por objeto la regulación de las actuaciones en materia de vivienda en la Comunidad Autónoma de Andalucía, en el ejercicio de la competencia exclusiva atribuida por el artículo 56.1 del Estatuto de Autonomía para Andalucía.",
            order_index: 0
        },
        {
            title: "TÍTULO PRELIMINAR: Disposiciones Generales",
            content: "Artículo 1. Objeto y finalidad.\n\nEsta ley tiene por objeto la protección del derecho a una vivienda digna y adecuada en Andalucía, estableciendo el marco normativo para las políticas públicas de vivienda.",
            order_index: 1
        },
        {
            title: "TÍTULO I: Del derecho a la vivienda",
            content: "CAPÍTULO I. Contenido del derecho.\n\nArtículo 7. Titularidad del derecho.\n\nTodas las personas físicas con vecindad administrativa en Andalucía tienen derecho a una vivienda digna y adecuada.",
            order_index: 2
        }
    ];

    const { error: blockError } = await supabase
        .from('document_blocks')
        .insert(blocks.map(b => ({ ...b, document_id: doc.id })));

    if (blockError) {
        console.error("❌ Error al crear bloques:", blockError);
    } else {
        console.log("✅ Bloques iniciales creados.");
    }

    // 4. Link to resource
    const { error: updateError } = await supabase
        .from('resources')
        .update({ document_id: doc.id })
        .eq('title', "Ley 5/2025, de 16 de diciembre, de Vivienda de Andalucía")
        .is('project_id', null);

    if (updateError) {
        console.error("❌ Error al vincular recurso:", updateError);
    } else {
        console.log("🔗 Recurso vinculado al documento correctamente.");
    }
}

importViviendaAsDocument().catch(console.error);
