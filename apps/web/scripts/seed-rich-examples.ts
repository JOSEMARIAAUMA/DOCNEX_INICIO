import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LEGAL_BLOCKS = [
    {
        title: "I. ENCABEZAMIENTO Y REPRESENTACIÓN",
        content: `AL JUZGADO DE PRIMERA INSTANCIA DE SEVILLA QUE POR TURNO CORRESPONDA

D. MANUEL RUIZ GONZÁLEZ, Procurador de los Tribunales, en nombre y representación de la entidad mercantil INMOBILIARIA GUADALQUIVIR S.L., según acredito mediante copia de escritura de poder que acompaño como Documento nº 1, bajo la dirección técnica del Letrado D. ALBERTO ASENSIO LARA, ante el Juzgado comparezco y, como mejor proceda en Derecho, DIGO:

Que por medio del presente escrito interpongo DEMANDA DE JUICIO ORDINARIO en reclamación de resolución contractual e indemnización por daños y perjuicios derivados de incumplimiento y vicios ocultos en la construcción, contra la entidad CONSTRUCCIONES MODERNAS S.A., con domicilio social en Avda. de la República Argentina nº 22, Sevilla.`
    },
    {
        title: "II. HECHOS: RELACIÓN CONTRACTUAL Y OBJETO",
        content: `PRIMERO.- Con fecha 12 de mayo de 2025, mi representada y la entidad demandada suscribieron un Contrato de Obra Llave en Mano para la ejecución de la promoción residencial denominada 'Hacienda Sur', compuesta por 24 viviendas unifamiliares.

SEGUNDO.- El precio total de la obra se fijó en la cantidad de TRES MILLONES DE EUROS (3.000.000 €), habiéndose abonado a día de hoy el 90% de dicha cuantía según las certificaciones de obra que se adjuntan como Documentos nº 2 a 15.

TERCERO.- En la Cláusula Cuarta del mencionado contrato, se estipuló de manera taxativa que la entrega de la totalidad de las viviendas se realizaría, a más tardar, el 1 de diciembre de 2025, estableciéndose penalizaciones diarias por demora de 500 € por vivienda.`
    },
    {
        title: "III. HECHOS: INCUMPLIMIENTO Y DEFECTOS CONSTRUCTIVOS",
        content: `CUARTO.- A la fecha de interposición de esta demanda, la obra no ha sido finalizada ni entregada. El informe pericial realizado por el Ingeniero de Caminos D. CARLOS MERA (Documento nº 16) estima que el grado de ejecución real no supera el 75%, existiendo un abandono patente de la actividad en la obra desde hace 45 días.

QUINTO.- No se trata únicamente de un retraso temporal, sino de graves vicios ocultos en la estructura de las viviendas ya construidas. Se han detectado:
- Grietas de asentamiento en los muros de carga de los bloques A y B.
- Humedades por capilaridad debido a una deficiente impermeabilización de la cimentación.
- Desviación de los materiales empleados respecto a la memoria de calidades técnica original.

Estos defectos comprometen la habitabilidad y seguridad de la promoción, requiriendo una inversión de reparación estimada en 450.000 €.`
    },
    {
        title: "IV. FUNDAMENTOS DE DERECHO",
        content: `I. JURISDICCIÓN Y COMPETENCIA.- Corresponde a los tribunales civiles de Sevilla por aplicación de los arts. 45 y 52.1 de la Ley de Enjuiciamiento Civil.

II. PROCEDIMIENTO.- Deberá sustanciarse por los trámites del Juicio Ordinario (arts. 248 y 249.2 de la LEC) dado que la cuantía de la reclamación supera los 6.000 €.

III. FONDO DEL ASUNTO.-
A) Art. 1101 del Código Civil: "Quedan sujetos a la indemnización de los daños y perjuicios causados los que en el cumplimiento de sus obligaciones incurrieren en dolo, negligencia o morosidad".
B) Art. 1124 del Código Civil: La facultad de resolver las obligaciones se entiende implícita en las recíprocas para el caso de que uno de los obligados no cumpliere lo que le incumbe.
C) Art. 1591 del Código Civil (Responsabilidad decenal): Sobre la ruina de los edificios por vicios en la construcción o dirección técnica.`
    },
    {
        title: "V. SUPLICO AL JUZGADO",
        content: `POR TODO LO EXPUESTO,

SUPLICO AL JUZGADO: Que teniendo por presentado este escrito de demanda junto con sus documentos y copias, se sirva admitirla y, tras los trámites legales oportunos, dicte sentencia por la que:
1. Se declare la resolución del contrato de obra de fecha 12/05/2025 por incumplimiento grave de la demandada.
2. Se condene a CONSTRUCCIONES MODERNAS S.A. a reintegrar las cantidades percibidas en exceso y a abonar la indemnización de SEISCIENTOS MIL EUROS (600.000 €) por daños emergentes y lucro cesante.
3. Se impongan a la parte demandada expresamente las costas del presente procedimiento.`
    }
];

const ARCH_BLOCKS = [
    {
        title: "1. VISIÓN ESTRATÉGICA Y CONTEXTO URBANO",
        content: `El proyecto 'Eco-Torre Caleta' se concibe como un hito arquitectónico en el litoral malagueño, integrando la densidad urbana equilibrada con el respeto absoluto al ecosistema marino. El objetivo trasciende la mera edificación residencial; buscamos generar un 'organismo arquitectónico' capaz de gestionar sus propios recursos.

La torre se sitúa en una parcela de 2.500 m² en primera línea de playa, conectando el Paseo Marítimo con el tejido residencial del Pedregalejo. Su volumetría se fragmenta para permitir el paso de las brisas del mar hacia el interior de la ciudad, minimizando el impacto visual y la sombra proyectada.`
    },
    {
        title: "2. ENVOLVENTE TÉRMICA Y SISTEMAS PASIVOS",
        content: `La fachada es el elemento crítico de regulación energética. Hemos diseñado una 'piel multicapa' compuesta por:
- Revestimiento de Piedra Caliza local con alta inercia térmica.
- Cámara de aire ventilada para disipación de calor por radiación solar.
- Doble acristalamiento de baja emisividad (U-value 1.1 W/m²K) con control solar dinámico.

La orientación Levante-Poniente se gestiona mediante lamas de madera termotratada que actúan como brise-soleil, protegiendo los huecos en verano y permitiendo la captación pasiva en los meses de invierno. Se estima una reducción del 40% en la demanda de refrigeración activa respecto a una torre convencional.`
    },
    {
        title: "3. CICLO INTEGRAL DEL AGUA",
        content: `En un clima mediterráneo, el agua es el recurso más valioso. Eco-Torre Caleta implementa un sistema bifásico de recuperación:
- Tratamiento de Aguas Grises: Las aguas provenientes de duchas y lavabos se filtran y purifican mediante un sistema de fitodepuración situado en la planta técnica intermedia, para ser reutilizadas en las cisternas de los inodoros.
- Captación Pluvial: La cubierta ajardinada de 400 m² actúa como esponja, dirigiendo el excedente de agua de lluvia a un depósito de 50.000 litros destinado al riego de los jardines verticales de la fachada sur.`
    },
    {
        title: "4. AUTOSUFICIENCIA ENERGÉTICA",
        content: `La torre incorpora 200 paneles fotovoltaicos BIPV (Building Integrated Photovoltaics) en la cara sur de la estructura, integrados estéticamente como elementos de sombreado.
- Potencia Instalada: 85 kWp.
- Sistema de Almacenamiento: Baterías de litio de última generación situadas en el sótano -2 con capacidad de 120 kWh.
- Gestión Inteligente (BMS): Un sistema centralizado optimiza el consumo en tiempo real, priorizando el uso de energía renovable para zonas comunes, ascensor y sistema de climatización de aerotermia centralizado.`
    }
];

const ACAD_BLOCKS = [
    {
        title: "INTRODUCCIÓN: LA PLAZA COMO ESCENARIO BARROCO",
        content: `El urbanismo barroco en el sur de España no fue meramente una cuestión de trazados geométricos, sino de la creación de una 'ciudad-teatro'. Tras el Concilio de Trento, el espacio público se convierte en el escenario de la visibilidad del poder y la fe. El vacío urbano (la plaza) deja de ser accidental para convertirse en intencional.

En Andalucía, esta transformación se manifiesta en la ampliación de los espacios frente a los templos y la creación de grandes ejes de perspectiva que transforman la fisonomía de las antiguas medinas musulmanas en ciudades de representación moderna.`
    },
    {
        title: "ANÁLISIS DE CASO I: LA ALAMEDA DE HÉRCULES (SEVILLA)",
        content: `Creada en 1574 por el Conde de Barajas, la Alameda de Hércules representa el primer jardín público de Europa. Sin embargo, su consolidación barroca ocurre en el siglo XVII con la introducción de fuentes, estatuas y el arbolado denso que define su trazado longitudinal.

Frente al modelo de Plaza Mayor cerrada (como la de Madrid o Valladolid), la Alameda sevillana introduce el concepto de 'salón urbano' abierto, donde la socialización es horizontal y el paseo se convierte en el rito social predominante de la Ilustración temprana.`
    },
    {
        title: "ANÁLISIS DE CASO II: LOS ENSANCHES BARROCOS EN MÁLAGA",
        content: `En Málaga, el impacto barroco es indisoluble de su relación con el puerto. La creación de la Alameda Principal sobre los terrenos ganados al mar a finales del siglo XVIII refleja la transición del urbanismo defensivo al urbanismo comercial y burgués.

La comparativa cartográfica entre los grabados de Hoefnagel y los planos de Olavide muestra cómo la retícula se expande, rompiendo la muralla y buscando la conexión con los ejes de salida hacia la vega y el interior, preludio de lo que serían los ensanches del siglo XIX.`
    },
    {
        title: "CONCLUSIONES: PERMANENCIAS CONTEMPORÁNEAS",
        content: `La estructura de la ciudad andaluza contemporánea sigue orbitando alrededor de estos vacíos barrocos. La habituación social al espacio exterior, al 'paseo' y a la plaza como centro de la vida colectiva es una herencia directa del siglo XVII.

El urbanismo actual no puede obviar estas trazas. El análisis semiótico de estos espacios nos revela que la plaza barroca no era solo un lugar de paso, sino un mecanismo de cohesión social que sigue funcionando quinientos años después de su concepción original.`
    }
];

async function seedRichContent() {
    console.log("🚀 Iniciando Sembrado de Contenido Rico y Profesional...");

    const datasets = [
        { name: "Bufete Jurídico: Demanda NEX-88", blocks: LEGAL_BLOCKS },
        { name: "Arquitectura: Eco-Torre Caleta", blocks: ARCH_BLOCKS },
        { name: "Academia: Urbanismo Barroco", blocks: ACAD_BLOCKS }
    ];

    for (const dataset of datasets) {
        console.log(`\n📂 Procesando: ${dataset.name}`);

        // Find project
        const { data: proj, error: pErr } = await supabase.from('projects').select('id').eq('name', dataset.name).single();
        if (pErr || !proj) {
            console.warn(`⚠️ No se encontró el proyecto: ${dataset.name}`);
            continue;
        }

        // Find or create document
        let { data: doc, error: dErr } = await supabase.from('documents').select('id').eq('project_id', proj.id).eq('title', 'Documento Base').single();
        if (!doc) {
            const { data: nDoc } = await supabase.from('documents').insert([{ project_id: proj.id, title: 'Documento Base' }]).select().single();
            doc = nDoc;
        }

        // Clear existing blocks for a fresh start
        if (!doc) {
            console.warn(`⚠️ No se pudo crear/encontrar documento para: ${dataset.name}`);
            continue;
        }

        await supabase.from('document_blocks').delete().eq('document_id', doc.id);

        // Insert rich blocks
        const blocksToInsert = dataset.blocks.map((b, i) => ({
            document_id: doc.id,
            title: b.title,
            content: b.content,
            order_index: i,
            updated_at: new Date().toISOString()
        }));

        const { error: iErr } = await supabase.from('document_blocks').insert(blocksToInsert);
        if (iErr) {
            console.error(`❌ Error insertando bloques en ${dataset.name}:`, iErr);
        } else {
            console.log(`✅ ${dataset.blocks.length} bloques enriquecidos añadidos.`);
        }
    }

    console.log("\n✨ Sembrado de contenido profesional completado.");
}

seedRichContent().catch(console.error);
