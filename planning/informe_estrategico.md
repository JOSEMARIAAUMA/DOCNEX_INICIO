# Informe Estratégico: De "Editor de Texto" a "Plataforma Cognitiva 3D"

## 1. Filosofía y Visión: "Arquitectura Documental"
**Diferenciación Clave:** DOCNEX no compite con la IA generativa (ChatGPT, Gemini), sino que es la **capa de gestión (Management Layer)** que permite a profesionales técnicos (arquitectos, abogados, ingenieros) domar el caos de información generada.

### El Concepto de "Capas" (Layers)
Inspirado en software CAD/BIM, tratamos el documento no como una secuencia plana de texto, sino como una superposición de estratos de información:
- **Capa Base:** El texto contenido (lo que se imprime).
- **Capa Estructural (Mapeo):** La jerarquía y límites de bloques (vigas y pilares del documento).
- **Capa Semántica:** Etiquetas, entidades y conexiones detectadas por IA.
- **Capa de Revisión:** Notas, versiones y comentarios (el "papel cebolla" de correcciones).

**Valor:** Permitir al experto "encender" y "apagar" estas capas para tener control total sobre la evolución del documento, transformando la redacción en un proceso de **diseño y construcción documental**.

## 2. Análisis del Material de Referencia
He analizado en profundidad los dos documentos proporcionados:
1.  **Estudio de Interfaces de Ciencia Ficción (FUI)**: Analiza cómo paradigmas de *Minority Report, Iron Man y Oblivion* resuelven la carga cognitiva mediante espacialidad, HUDs contextuales y modularidad.
2.  **Especificación NexDoc AI (GPT_APP)**: Una hoja de ruta técnica y de producto extremadamente detallada que propone una arquitectura "Anti-Maraña" basada en un **Árbol Sólido** (Tronco + 4 Ramas Fijas) y una gestión documental procedimental ("Cajas" y "Snapshots").

### Diagnóstico de la Situación Actual vs. Visión Propuesta
Estamos en un punto de **inflexión crítica**.
*   **Estado Actual**: Hemos implementado un "Grafo de Conocimiento" usando `react-force-graph-2d`. Es un grafo de fuerza dirigida "libre".
*   **Problema Detectado**: El estudio advierte explícitamente contra los "mapas mentales confusos" y los "grafos libres" que generan caos visual ("spaghetti map"). Nuestra implementación actual, aunque funcional tecnológicamente, corre el riesgo de caer en esa "maraña" visual al escalar.
*   **La Solución Propuesta ("El Árbol Sólido")**: Cambiar la metáfora visual de "Red Neuronal" (caótica) a "Estructura Arquitectónica" (ordenada). Un tronco (Capítulos) con ramas fijas (Evidencia, Borradores, Datos, Control).

## 2. Validación de la Propuesta "Operativa Primero"
El usuario ha solicitado explícitamente: *"prefiero primero desarrollar más a fondo la operativa y ya mejoraremos la visualización sabiendo lo que tenemos que integrar"*.

Esto es **absolutamente correcto y estratégico**.
El "Árbol Sólido 3D" no es solo una visualización bonita; es una **representación de estados agregados**. El árbol 3D **no lee** el contenido crudo; lee "contadores" y "estados" (ej. "¿Este capítulo tiene issues abiertos?", "¿Cuántas evidencias tiene asociadas?").

**Consecuencia Técnica**: No podemos dibujar el árbol 3D hasta que no tengamos los **datos** que lo alimentan. Actualmente tenemos `blocks` (Capítulos), pero nos faltan:
1.  **Estados Procedimentales (`doc_states`)**: Las "Cajas" que definen versiones selladas.
2.  **Evidencia Estructurada (`resources` + `extracts`)**: Distinguir entre un *link semántico genérico* y una *evidencia anclada a un PDF*.
3.  **Capa de Control (`issues`)**: Para que el árbol pueda mostrar alertas (ramas de "Control").

## 3. Hoja de Ruta de Pivote (Realineación con GPT_APP)
Propongo detener el desarrollo visual en `ForceGraph2D` (ya que será reemplazado por R3F en el futuro según el plan) y centrarnos en construir la **Columna Vertebral de Datos** descrita en los Sprints 1-3 y 6 del documento GPT_APP.

### Fase A: Infraestructura y Recursos (Sprint 1 del documento)
*   **Objetivo**: Gestión robusta de fuentes externas. No más "archivos sueltos".
*   **Acciones**:
    *   Implementar tablas `resources` (Fuentes) y `doc_states` (Cajas).
    *   Subida de archivos a Supabase Storage con trazabilidad (`resources`).
    *   **Corrección**: Migrar nuestra lógica actual de importación para que use esta estructura.

### Fase B: El Canon y la Evidencia (Sprint 2 y 3 del documento)
*   **Objetivo**: Trazabilidad real. "¿De dónde sale este párrafo?".
*   **Acciones**:
    *   Refinar `blocks`: Asegurar IDs estables y jerarquía (ya lo tenemos avanzado).
    *   Implementar `extracts`: La unidad atómica de evidencia. Un *quote* específico dentro de un PDF.
    *   **Migración**: Convertir/Adaptar nuestros `semantic_links` actuales al modelo de `block_links` tipados (`supports`, `contradicts`, `source_of`).

### Fase C: La Dimensión Temporal (Sprint 6 del documento)
*   **Objetivo**: Control de versiones real, no lineal.
*   **Acciones**:
    *   Implementar lógica de "Snapshots" sellados.
    *   Permitir "viajar" entre "Cajas" (Estados de tramitación).

### Fase D: El Árbol Sólido 3D (Sprint 4 del documento)
*   **Objetivo**: Visualización Cognitiva.
*   **Acciones**:
    *   Solo entonces, instalar `React Three Fiber`.
    *   Construir la escena 3D que consume los *agregados* de las fases A, B y C.
    *   El 3D será la "Brújula", el panel 2D (actual `SupportDocumentsSection`) será el "Taller".

## 4. DocNex Completion Index (DCI) - Plan de Valor 100%
Respondiendo a su solicitud de valoración, he creado un índice para medir cuánto nos acercamos al objetivo de **"Capa de Gestión Definitiva"**:

**Estado Actual: 35% / 100%**

### Desglose del Valor
1.  **Ingesta de Caos (Peso 20%) - Actual: 10%** 🚧
    *   *Objetivo:* Absorber PDFs, chats, webs sin perder trazabilidad.
    *   *Falta:* "Smart Adaptive Import" y vincular cada bloque a su fuente exacta (ej: página del PDF).
2.  **Estructuración "Esqueleto" (Peso 30%) - Actual: 15%** 🚧
    *   *Objetivo:* Mapeo automático de jerarquías complejas.
    *   *Falta:* Sub-bloques inteligentes y detección de entidades automática confiable.
3.  **Gestión por Capas (Peso 20%) - Actual: 5%** 🏗️
    *   *Objetivo:* Ocultar/Mostrar complejidad a voluntad (Visor Integral).
    *   *Falta:* Acabamos de empezar. Faltan capas de "Entidades" y "Versiones" visuales.
4.  **Síntesis y Convergencia (Peso 30%) - Actual: 5%** 🔴
    *   *Objetivo:* Fundir 5 versiones de IA en 1 verdad final.
    *   *Falta:* No tenemos herramientas de "Merge" inteligente ni comparador de versiones lado a lado dentro del bloque.

## 5. Conclusión y Recomendación
El estudio de ciencia ficción y la especificación técnica son brillantes y perfectamente viables. Nos dan un "Norte" claro: **Dejar de construir un editor y empezar a construir un sistema de arquitectura de información.**

**Recomendación Inmediata**:
Adoptar el plan de "Operativa Primero".
1.  **Congelar** la UI del grafo 2D actual.
2.  **Ejecutar** las migraciones de base de datos para `doc_states`, `resources` y `extracts`.
3.  **Adaptar** el panel lateral para gestionar "Recursos" y "Estados" en lugar de solo "Inspiración".

¿Procedemos a implementar la **Fase A (Infraestructura de Estados y Recursos)** tal como define el plan?
