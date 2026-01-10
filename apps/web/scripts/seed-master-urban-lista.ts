import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const URBAN_PROJECT_NAME = "MAESTRÍA URBANÍSTICA: ESTUDIO DE DETALLE (LISTA + DL 1/2025)";

const MEMORIA_BLOCKS = [
    {
        title: "1. OBJETO Y ALCANCE: EL MARCO DE LA LISTA",
        content: `El presente Estudio de Detalle (en adelante, ED) tiene por objeto la reordenación de volúmenes y el ajuste de alineaciones en la Parcela R-4 del Sector SUD-T1 'La Azucarera', en cumplimiento de lo establecido en el Artículo 71 de la Ley 7/2021, de 1 de diciembre, de Impulso para la Sostenibilidad del Territorio de Andalucía (LISTA).

A diferencia de los instrumentos de planeamiento general, este ED no altera el aprovechamiento urbanístico ni el uso global de la parcela, limitándose a optimizar la disposición física de la edificación para garantizar una mejor eficiencia energética y una integración paisajística superior en el borde urbano.`,
        tags: ["LISTA", "Art_71", "Objeto", "Ordenación_Volúmenes"]
    },
    {
        title: "2. JUSTIFICACIÓN DE LA NECESIDAD Y OPORTUNIDAD",
        content: `La tramitación de este instrumento se justifica técnicamente por la necesidad de adaptar la configuración edificatoria original a las nuevas demandas habitacionales derivadas del Decreto-ley 1/2025. Específicamente, se busca materializar un incremento en el número de viviendas protegidas sin afectar a la edificabilidad total, mediante el ajuste de las condiciones de posición y forma.

Este ED se redacta bajo la modalidad de 'Ajuste de Parámetros por Vivienda Asequible', permitida por la disposición adicional quinta del Reglamento General de la LISTA (RGLISTA), asegurando que la solución adoptada no supone una merma de los estándares dotacionales ni de las cesiones de suelo público obligatorias.`,
        tags: ["DL_1/2025", "Vivienda_Asequible", "RGLISTA", "Justificación"]
    },
    {
        title: "3. MEMORIA DE INFORMACIÓN Y DIAGNÓSTICO",
        content: `La parcela objeto de ordenación presenta una superficie neta de 4.250 m², lindando al norte con el sistema general de espacios libres (SGEL-2) y al sur con el vial estructurador V-01.

En el diagnóstico previo, se ha detectado una incompatibilidad entre la rasante teórica del planeamiento original y la topografía real tras las obras de urbanización del sector. El ED propone un reajuste de las rasantes y de las alturas máximas, que pasarán de B+3 a B+3+Ático, compensando la mayor ocupación en planta con un retranqueo adicional de 5 metros respecto al eje de la calzada, mejorando así la permeabilidad visual del conjunto.`,
        tags: ["Diagnóstico", "Topografía", "Rasantes", "Altura_Máxima"]
    },
    {
        title: "4. MEMORIA DE ORDENACIÓN: PARÁMETROS EDIFICATORIOS",
        content: `Se establecen las siguientes determinaciones de ordenación pormenorizada:
- **Alineaciones:** Se ajusta la alineación interior para generar un patio de manzana de 800 m² de uso privado pero con servidumbre de paso peatonal diurno hacia el SGEL.
- **Ocupación Máxima:** 60% en planta baja y 45% en plantas superiores.
- **Volumetría:** Se permite la agrupación de volúmenes en dos bloques lineales de 12 metros de fondo, optimizando la ventilación cruzada y la captación solar pasiva.
- **Vuelos:** Se autorizan vuelos de 1,20 metros sobre alineación interior siempre que no superen el 30% de la fachada.

Estas determinaciones sustituyen a las fijadas de forma genérica en el Plan Parcial para esta manzana, al amparo del Art. 85.2 del RGLISTA.`,
        tags: ["Alineaciones", "Ocupación", "Volumetría", "Vuelos"]
    },
    {
        title: "5. JUSTIFICACIÓN NORMATIVA Y CUMPLIMIENTO DE LA LISTA",
        content: `En cumplimiento del Art. 94.4 del RGLISTA, se acredita:
1. **No alteración del aprovechamiento:** El aprovechamiento propuesto de 1.25 m²t/m²s coincide exactamente con el asignado por el Plan General.
2. **No afectación a dotaciones:** No se eliminan ni reducen espacios libres ni equipamientos públicos.
3. **Mejora del entorno:** La nueva disposición mejora el asoleamiento de las viviendas vecinas en un 15% según el estudio de sombras anexo.

La tramitación seguirá el procedimiento abreviado por ser un municipio de menos de 20.000 habitantes, conforme al Art. 124 de la LISTA.`,
        tags: ["Cumplimiento_Art_94", "Aprovechamiento", "Procedimiento_Abreviado"]
    }
];

const NORMATIVA_BLOCKS = [
    {
        title: "ARTÍCULO 62 LISTA. ESTUDIOS DE DETALLE",
        content: `1. Los Estudios de Detalle tienen por objeto completar o adaptar las determinaciones de la ordenación pormenorizada en cualquier clase de suelo.
2. Su finalidad principal es:
   a) Señalar alineaciones y rasantes.
   b) Ordenar los volúmenes de la edificación.
   c) Completar la red viaria secundaria.
3. En ningún caso podrán:
   a) Reducir o desfigurar el destino de las cesiones de suelo.
   b) Incrementar el aprovechamiento urbanístico.
   c) Alterar el uso global ni los usos pormenorizados dominantes.`,
        tags: ["Normativa_Base", "LISTA", "Limitaciones"]
    },
    {
        title: "ARTÍCULO 85 RGLISTA. CONTENIDO DE LOS ESTUDIOS DE DETALLE",
        content: `Los Estudios de Detalle contendrán:
a) Memoria justificativa de su conveniencia y de la procedencia de las soluciones adoptadas.
b) Planos de información (estado actual, servidumbres, planeamiento anterior).
c) Planos de ordenación (alineaciones, rasantes y volúmenes propuestos).
d) Estudio comparativo que demuestre la no alteración del aprovechamiento.`,
        tags: ["Contenido_Mínimo", "RGLISTA", "Memoria"]
    }
];

async function seedMasterProject() {
    console.log("🏙️ Iniciando Creación del Proyecto Maestro de Urbanismo (Andalucía)...");

    // 1. Create/Find Workspace (Default)
    let { data: workspace } = await supabase.from('workspaces').select('id').order('created_at', { ascending: true }).limit(1).single();
    if (!workspace) {
        const { data: nw } = await supabase.from('workspaces').insert([{ name: 'Workspace Profesional' }]).select().single();
        workspace = nw;
    }

    // 2. Create Project
    let { data: project, error: pErr } = await supabase.from('projects').select('id').eq('name', URBAN_PROJECT_NAME).single();
    if (!project) {
        const { data: np } = await supabase.from('projects').insert([{
            workspace_id: workspace!.id,
            name: URBAN_PROJECT_NAME,
            description: "Proyecto de referencia para Estudios de Detalle bajo la LISTA y el Decreto-ley 1/2025. Incluye análisis semántico y jerarquía normativa."
        }]).select().single();
        project = np;
    }
    console.log(`✅ Proyecto: ${URBAN_PROJECT_NAME} (ID: ${project!.id})`);

    const documents = [
        { title: "ED-01: Memoria de Información y Ordenación", blocks: MEMORIA_BLOCKS },
        { title: "NORM-01: Compendio Normativo LISTA/RGLISTA", blocks: NORMATIVA_BLOCKS }
    ];

    for (const docInfo of documents) {
        // 3. Create/Update Document
        let { data: doc } = await supabase.from('documents').select('id').eq('project_id', project!.id).eq('title', docInfo.title).single();
        if (!doc) {
            const { data: nDoc } = await supabase.from('documents').insert([{ project_id: project!.id, title: docInfo.title }]).select().single();
            doc = nDoc;
        }
        console.log(`📄 Documento: ${docInfo.title}`);

        // 4. Clear Old Blocks
        await supabase.from('document_blocks').delete().eq('document_id', doc!.id);

        // 5. Insert Professional Blocks
        const blocksToInsert = docInfo.blocks.map((b, i) => ({
            document_id: doc!.id,
            title: b.title,
            content: b.content,
            tags: b.tags,
            order_index: i,
            updated_at: new Date().toISOString()
        }));

        const { error: iErr } = await supabase.from('document_blocks').insert(blocksToInsert);
        if (iErr) {
            console.error(`❌ Error insertando bloques en ${docInfo.title}:`, iErr);
        } else {
            console.log(`   ✅ ${docInfo.blocks.length} bloques profesionales indexados.`);
        }
    }

    console.log("\n✨ Proyecto Maestro Urbanístico Creado con Éxito.");
    console.log("Este proyecto servirá como base de conocimiento para el entrenamiento de los agentes.");
}

seedMasterProject().catch(console.error);
