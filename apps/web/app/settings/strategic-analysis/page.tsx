'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Plus, Trash2, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Document } from '@docnex/shared';
import { listDocuments, createDocument, deleteDocument, getActiveProject, createBlock } from '@/lib/api';

// Content for the default/seed documents
const STRATEGIC_ANALYSIS_V1 = `# Informe Autocrítico: Estado Actual de NexDoc AI vs. Utilidad Real

**Fecha:** 2026-01-09
**Versión:** 1.0
**Enfoque:** Análisis de Usabilidad y Utilidad Real desde la perspectiva del Usuario Pro.

## 1. Resumen Ejecutivo: La Brecha de Utilidad
La aplicación, en su estado actual, **ha fallado en su promesa básica de utilidad**. Nos hemos centrado en implementar características técnicas aisladas ("Grafos", "Importadores") y visualizaciones complejas, perdiendo de vista el flujo de trabajo esencial del arquitecto/abogado.
**Resultado Actual:** Una colección de componentes técnicos desconectados que no permiten completar un flujo de trabajo real de principio a fin sin frustración o bloqueos. La "maraña" visual que queríamos evitar en el grafo se ha trasladado a la experiencia de usuario: muchas piezas, poca cohesión.

## 2. Análisis de Fallos Críticos (Categoría: "Showshoppers")
Estos son fallos que hacen que la app sea inutilizable para un entorno profesional hoy mismo.

### A. Gestión de Proyectos Inexistente (CRUD Básico Roto)
*   **Problema:** El usuario no puede "limpiar" su espacio de trabajo. No se pueden eliminar documentos de prueba, archivarlos, duplicarlos para versionar ni exportarlos.
*   **Impacto:** El workspace se convierte rápidamente en un vertedero de pruebas fallidas. Sensación de falta de control total.
*   **Estado:** 🔴 CRÍTICO. Funcionalidad básica de gestión de archivos ausente.

### B. Edición de Bloques Bloqueada
*   **Problema:** El botón "Eliminar Bloque" no funciona.
*   **Impacto:** Si el usuario importa mal o se equivoca, no puede corregirlo. La edición es destructiva solo por adición, no por sustracción.
*   **Estado:** 🔴 CRÍTICO. Un editor que no permite borrar es inservible.

### C. La Promesa de la "Red" Vacía
*   **Problema:** El apartado "Red" muestra valor 0 persistentemente, incluso con documentos grandes cargados.
*   **Impacto:** La promesa de "ver conexiones" es falsa. El usuario invierte tiempo subiendo datos y el sistema no le devuelve nada. Pérdida inmediata de confianza en la "inteligencia" del sistema.
*   **Estado:** 🔴 CRÍTICO (Bug Funcional).

### D. Ceguera de Fuentes
*   **Problema:** No se pueden consultar las fuentes ni los recursos subidos de manera efectiva.
*   **Impacto:** En un entorno jurídico/técnico, escribir sin poder ver la fuente original al lado es imposible. La app obliga a trabajar "de memoria" o con ventanas externas, rompiendo el propósito de "entorno integrado".

## 3. Análisis de Oportunidades Perdidas (Categoría: "Utilidad Core")
Estas son las características que *deberían* ser el corazón de la app y hoy no existen o son ineficaces.

### A. Ausencia de "Trabajo en Paralelo" (Split View)
*   **Necesidad:** "Editar textos comparando en paralelo".
*   **Realidad Actual:** El editor es una columna única monótona. No hay forma cómoda de poner "Borrador A" junto a "Borrador B" o "Documento Referencia" junto a "Editor".
*   **Veredicto:** La UI actual es simplista (tipo blog), no profesional (tipo workbench).

### B. IA "Sorda y Muda"
*   **Necesidad:** Un asistente que entienda el *contexto* (Rol: Abogado experto, Tono: Formal) y acepte instrucciones narrativas complejas para la importación.
*   **Realidad Actual:**
    *   No hay configuración global de "Personalidad de la IA".
    *   La importación es una "caja negra": el usuario sube un archivo y reza para que se corte bien. No puede decirle: *"Oye, fusiona los párrafos cortos y detecta los Artículos como sub-bloques"*.
    *   No hay herramientas de reescritura *in-situ* ("Reescribe esto más formal").
*   **Veredicto:** Tenemos una IA que solo "procesa" en segundo plano, pero no "asiste" activamente en el primer plano.

## 4. Plan de Acción Correctiva (Sprint Utility)
El próximo ciclo de desarrollo no debe añadir ni una sola "feature visual 3D" nueva hasta que lo siguiente esté resuelto:

1.  **Reparación de Fundamentos (Día 1-2):**
    *   Habilitar Delete/Archive/Duplicate/Export de Documentos.
    *   Arreglar botón Eliminar Bloque.
    *   Debuggear contador de Red y visualización de Recursos.

2.  **Implementación de "Workbench Real" (Día 3-5):**
    *   **Split View:** Panel lateral derecho *realmente* funcional que permita cargar otro documento o recurso PDF completo para lectura paralela.
    *   **Consultor de Fuentes:** Visor de recursos integrado navegable.

3.  **Activación de la IA Asistente (Día 6-8):**
    *   **Panel de Contexto IA:** Configuración global del documento (Rol, Tono, Objetivo).
    *   **Importación Narrativa:** Campo de texto libre en el wizard de importación para dar instrucciones de parseo al LLM (*"Instrucciones de corte: ..."*).
    *   **Toolbox de Reescritura:** Menú contextual en bloque: "Reescribir con IA (Más formal / Resumir / Expandir)".

**Conclusión:** La app debe dejar de ser una demo técnica y empezar a ser una herramienta de trabajo. Menos fuegos artificiales, más martillo y cincel.
`;

const STRATEGIC_ANALYSIS_V2 = `# Informe Estratégico: De "Editor de Texto" a "Plataforma Cognitiva 3D"

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
*   **Estado Actual**: Hemos implementado un "Grafo de Conocimiento" usando \`react-force-graph-2d\`. Es un grafo de fuerza dirigida "libre".
*   **Problema Detectado**: El estudio advierte explícitamente contra los "mapas mentales confusos" y los "grafos libres" que generan caos visual ("spaghetti map"). Nuestra implementación actual, aunque funcional tecnológicamente, corre el riesgo de caer en esa "maraña" visual al escalar.
*   **La Solución Propuesta ("El Árbol Sólido")**: Cambiar la metáfora visual de "Red Neuronal" (caótica) a "Estructura Arquitectónica" (ordenada). Un tronco (Capítulos) con ramas fijas (Evidencia, Borradores, Datos, Control).

## 2. Validación de la Propuesta "Operativa Primero"
El usuario ha solicitado explícitamente: *"prefiero primero desarrollar más a fondo la operativa y ya mejoraremos la visualización sabiendo lo que tenemos que integrar"*.

Esto es **absolutamente correcto y estratégico**.
El "Árbol Sólido 3D" no es solo una visualización bonita; es una **representación de estados agregados**. El árbol 3D **no lee** el contenido crudo; lee "contadores" y "estados" (ej. "¿Este capítulo tiene issues abiertos?", "¿Cuántas evidencias tiene asociadas?").

**Consecuencia Técnica**: No podemos dibujar el árbol 3D hasta que no tengamos los **datos** que lo alimentan. Actualmente tenemos \`blocks\` (Capítulos), pero nos faltan:
1.  **Estados Procedimentales (\`doc_states\`)**: Las "Cajas" que definen versiones selladas.
2.  **Evidencia Estructurada (\`resources\` + \`extracts\`)**: Distinguir entre un *link semántico genérico* y una *evidencia anclada a un PDF*.
3.  **Capa de Control (\`issues\`)**: Para que el árbol pueda mostrar alertas (ramas de "Control").

## 3. Hoja de Ruta de Pivote (Realineación con GPT_APP)
Propongo detener el desarrollo visual en \`ForceGraph2D\` (ya que será reemplazado por R3F en el futuro según el plan) y centrarnos en construir la **Columna Vertebral de Datos** descrita en los Sprints 1-3 y 6 del documento GPT_APP.

### Fase A: Infraestructura y Recursos (Sprint 1 del documento)
*   **Objetivo**: Gestión robusta de fuentes externas. No más "archivos sueltos".
*   **Acciones**:
    *   Implementar tablas \`resources\` (Fuentes) y \`doc_states\` (Cajas).
    *   Subida de archivos a Supabase Storage con trazabilidad (\`resources\`).
    *   **Corrección**: Migrar nuestra lógica actual de importación para que use esta estructura.

### Fase B: El Canon y la Evidencia (Sprint 2 y 3 del documento)
*   **Objetivo**: Trazabilidad real. "¿De dónde sale este párrafo?".
*   **Acciones**:
    *   Refinar \`blocks\`: Asegurar IDs estables y jerarquía (ya lo tenemos avanzado).
    *   Implementar \`extracts\`: La unidad atómica de evidencia. Un *quote* específico dentro de un PDF.
    *   **Migración**: Convertir/Adaptar nuestros \`semantic_links\` actuales al modelo de \`block_links\` tipados (\`supports\`, \`contradicts\`, \`source_of\`).

### Fase C: La Dimensión Temporal (Sprint 6 del documento)
*   **Objetivo**: Control de versiones real, no lineal.
*   **Acciones**:
    *   Implementar lógica de "Snapshots" sellados.
    *   Permitir "viajar" entre "Cajas" (Estados de tramitación).

### Fase D: El Árbol Sólido 3D (Sprint 4 del documento)
*   **Objetivo**: Visualización Cognitiva.
*   **Acciones**:
    *   Solo entonces, instalar \`React Three Fiber\`.
    *   Construir la escena 3D que consume los *agregados* de las fases A, B y C.
    *   El 3D será la "Brújula", el panel 2D (actual \`SupportDocumentsSection\`) será el "Taller".

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
2.  **Ejecutar** las migraciones de base de datos para \`doc_states\`, \`resources\` y \`extracts\`.
3.  **Adaptar** el panel lateral para gestionar "Recursos" y "Estados" en lugar de solo "Inspiración".

¿Procedemos a implementar la **Fase A (Infraestructura de Estados y Recursos)** tal como define el plan?
`;

const STRATEGIC_ANALYSIS_V3 = `# Informe Estratégico: DOCNEX AI
## *De la Edición de Texto a la Arquitectura Cognitiva Documental*

### 1. Identidad y Visión: ¿Qué es DOCNEX AI?
DOCNEX AI no es un simple editor de texto ni un "wrapper" de IA. Es una **Plataforma de Arquitectura Documental** diseñada para profesionales que gestionan información de alta complejidad (legal, técnica, arquitectónica, ingeniería).

**La Misión:** Transformar documentos "planos" y caóticos en **estructuras de datos jerárquicas y semánticas**, donde cada párrafo tiene un origen (linaje), una función y una conexión con el ecosistema de conocimiento del proyecto.

---

### 2. Objetivos Estratégicos y Competitividad
DOCNEX busca resolver la "Carga Cognitiva" que los modelos de chat tradicionales (ChatGPT/Gemini) no pueden manejar por sí solos debido a sus interfaces lineales.

#### Objetivos para ser Competitiva:
*   **Domar el Caos (Anti-Maraña):** Sustituir los grafos de conocimiento desordenados por una estructura de **"Árbol Sólido"** (Tronco de Capítulos + Ramas de Evidencia/Control).
*   **Trazabilidad Total (Linaje):** Garantizar que cada decisión o párrafo generado por la IA pueda rastrearse hasta su fuente original (PDF, normativa, borrador previo).
*   **Interacción de "Cero Clics":** Minimizar la fricción del usuario mediante herramientas contextuales que aparecen solo cuando se necesitan.

---

### 3. Pilares de Valor Diferenciado

#### A. Arquitectura por Capas (Layering)
Inspirado por el software CAD/BIM, DOCNEX trata el documento como una superposición de estratos:
1.  **Capa Base:** El contenido textual puro.
2.  **Capa Estructural:** La jerarquía de bloques y capítulos.
3.  **Capa Semántica:** Etiquetas, entidades y conexiones lógicas detectadas por IA.
4.  **Capa de Revisión (Papel Cebolla):** Notas, propuestas de cambio y trazabilidad temporal.

#### B. El "ADN" de la IA y Perfiles Personalizados (AI Gems)
A diferencia de otros editores, DOCNEX permite definir el **Contexto Global de la IA**:
*   **DNA Configurator:** Define el Rol, Tono, Objetivo e Instrucciones Críticas que rigen toda la sesión.
*   **AI Profiles Management:** Sistema de "Gemas" para guardar y alternar entre distintas personalidades de experto (ej. "Auditor Legal", "Redactor Técnico", "Analista de Contradicciones").

#### C. Inteligencia Ejecutable (Executable Notas)
No solo sugiere cambios; los **ejecuta**. Mediante el sistema de *Executable Notes*, la IA propone una mejora o corrección, muestra un *diff* visual y permite al usuario aplicar el cambio directamente al editor con un solo clic.

#### D. Ingesta Inteligente (Smart Import Wizard v2)
Un motor de importación que utiliza IA para "entender" la estructura de PDFs complejos, dividiéndolos automáticamente en bloques lógicos y clasificándolos por categorías (Evidencia, Datos, Referencia).

---

### 4. Capacidad Tecnológica Actualizada (Resumen de Features)

| Feature | Descripción | Propósito Estratégico |
| :--- | :--- | :--- |
| **Editor Dinámico Tiptap** | Basado en bloques con extensiones personalizadas. | Flexibilidad total en la manipulación de datos. |
| **Split-View Workspace** | Panel lateral para comparativas y visualización de recursos. | Reducción de carga cognitiva al evitar el cambio de pestañas. |
| **Snapshot Protection** | Guardado automático y preventivo antes de operaciones críticas. | Integridad de datos y "Viaje en el tiempo" documental. |
| **Knowledge Graph** | Visualización de conexiones semánticas entre documentos. | Descubrimiento de relaciones no evidentes en textos largos. |
| **Cajas (Snapshots Sellados)** | Gestión procidimental de versiones. | Control de estados en la tramitación de documentos oficiales. |

---

### 5. ¿Por qué es un valor superior para Gemini Pro?
Para una IA como **Gemini Pro**, DOCNEX es el "exoesqueleto" perfecto. Mientras Gemini aporta el razonamiento superior, DOCNEX le proporciona:
1.  **Contexto Ultra-Específico:** No recibe texto suelto, sino bloques con metadata rica.
2.  **Instrucciones de ADN:** Un marco ético y técnico (System Prompts) persistente y personalizable.
3.  **Herramientas de Salida Estructurada:** Esquemas de validación (Zod) que garantizan que las respuestas de la IA sean operativas y no solo conversacionales.

---

### 6. Conclusión para Gemini
> *"DOCNEX no es una herramienta para escribir más rápido; es un sistema operativo para **pensar y construir mejor** documentos complejos. Tu objetivo como IA dentro de este ecosistema es actuar como el **Arquitecto de Información**, asegurando que cada bloque cumpla con el ADN definido y mantenga la coherencia semántica con el resto del proyecto."*
`;



const STRATEGIC_ANALYSIS_V4 = `
<div class="p-8 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
  <div class="flex items-center gap-4 mb-8">
    <div class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
      <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    </div>
    <div>
      <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-tighter">Plan Maestro: IA Multiagente</h1>
      <p class="text-indigo-200/60 font-medium">Revolución Cognitiva en DOCNEX</p>
    </div>
  </div>

  <div class="space-y-8">
    <section class="p-6 bg-white/5 rounded-2xl border border-white/10">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-2 h-6 bg-indigo-500 rounded-full"></span> 1. Visión: El Segundo Cerebro
      </h2>
      <p class="text-indigo-100/80 leading-relaxed">
        Eliminamos la <strong>falta de estado</strong>. DOCNEX dejará de ser una herramienta reactiva para convertirse en un <strong>Socio Cognitivo</strong> con Memoria Episódica y Semántica. La IA ya no preguntará "¿Qué quieres hacer?", sino que dirá "He preparado esto basándome en tu estilo anterior".
      </p>
    </section>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
        <h3 class="font-bold text-indigo-300 mb-2">Memoria Híbrida</h3>
        <p class="text-xs text-indigo-200/60">Jerarquía MemGPT: Sensorial, Trabajo y Central (El ADN del Autor).</p>
      </div>
      <div class="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
        <h3 class="font-bold text-purple-300 mb-2">HITL Granular</h3>
        <p class="text-xs text-purple-200/60">Logging de distancia de edición y análisis de ráfagas para aprender sin preguntar.</p>
      </div>
      <div class="p-4 bg-pink-500/10 rounded-xl border border-pink-500/20">
        <h3 class="font-bold text-pink-300 mb-2">Multi-Agente</h3>
        <p class="text-xs text-pink-200/60">Orquestación de Bibliotecarios, Investigadores y Críticos especializados.</p>
      </div>
    </div>

    <section class="p-6 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-2xl border border-white/5">
      <h2 class="text-xl font-bold text-white mb-4">Roadmap de Ejecución</h2>
      <ul class="space-y-4">
        <li class="flex items-start gap-3">
          <div class="mt-1.5 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
          <div>
            <span class="block font-bold text-indigo-200">Fase 1: Observabilidad Total</span>
            <span class="text-sm text-indigo-200/50">Implementación de Event Sourcing y Cómputo de Feedback Implícito.</span>
          </div>
        </li>
        <li class="flex items-start gap-3">
          <div class="mt-1.5 w-2 h-2 rounded-full bg-purple-400"></div>
          <div>
            <span class="block font-bold text-purple-200">Fase 2: Del RAG al GraphRAG</span>
            <span class="text-sm text-purple-200/50">Representación del documento como un Grafo de Conocimiento Semántico.</span>
          </div>
        </li>
      </ul>
    </section>

    <div class="pt-4 border-t border-white/10 flex justify-between items-center">
      <span class="text-[10px] text-white/20 font-mono">DOCNEX_CORE_BETA v2.5</span>
      <span class="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30 tracking-widest uppercase">Listo para Ejecución</span>
    </div>
  </div>
</div>
<br/>
<p><em>Este plan ha sido generado por Antigravity tras el análisis profundo de arquitecturas cognitivas adaptativas.</em></p>
`;

const STRATEGIC_ANALYSIS_V5 = `
<div class="p-8 bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
  <div class="flex items-center gap-4 mb-8">
    <div class="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
      <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
    </div>
    <div>
      <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 uppercase tracking-tighter">La Casa del Bibliotecario</h1>
      <p class="text-amber-200/60 font-medium">Repositorio Normativo Global e Inteligencia Cruzada</p>
    </div>
  </div>

  <div class="space-y-8">
    <section class="p-6 bg-white/5 rounded-2xl border border-white/10">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-2 h-6 bg-amber-500 rounded-full"></span> 1. Visión: El Repositorio Maestro
      </h2>
      <p class="text-amber-100/80 leading-relaxed">
        Hemos trascendido la gestión de archivos locales. <strong>La Librería</strong> actúa como la memoria central de DOCNEX. No solo almacena leyes, sino que acumula la <strong>experiencia colectiva</strong> de cómo esas leyes han sido aplicadas, contradichas o simplificadas en proyectos reales.
      </p>
    </section>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
        <h3 class="font-bold text-amber-300 mb-2 font-black uppercase tracking-widest text-[10px]">Topología Maestría</h3>
        <p class="text-xs text-amber-200/60 leading-relaxed">Mapeo 3D de relaciones normativas. Permite visualizar qué leyes anclan a otras y detectar colisiones jerárquicas de un vistazo.</p>
      </div>
      <div class="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
        <h3 class="font-bold text-orange-300 mb-2 font-black uppercase tracking-widest text-[10px]">Agentes de Perfil</h3>
        <p class="text-xs text-orange-200/60 leading-relaxed">Activación dinámica de especialistas (Legal, Arquitecto, Economista) según la temática detectada por la IA.</p>
      </div>
    </div>

    <section class="p-6 bg-gradient-to-r from-amber-500/10 to-transparent rounded-2xl border border-white/5">
      <h2 class="text-xl font-bold text-white mb-4">Capa de Experiencia (Knowledge Tree)</h2>
      <p class="text-sm text-amber-200/70 mb-4 leading-relaxed">
        Cada bloque normativo ahora tiene un "linaje de aplicación". Si una ley falló en un proyecto anterior, el <strong>Analista AI</strong> te lo advertirá en el chat antes de que cometas el mismo error.
      </p>
      <div class="flex gap-3">
        <span class="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-full border border-amber-500/30 tracking-widest uppercase">Cross-Project Learning</span>
        <span class="px-3 py-1 bg-white/5 text-amber-200/40 text-[10px] font-black rounded-full border border-white/10 tracking-widest uppercase">Semantic GraphRAG</span>
      </div>
    </section>

    <div class="pt-4 border-t border-white/10 flex justify-between items-center">
      <span class="text-[10px] text-white/20 font-mono">LIBRARIAN_CORE_ALPHA v1.0</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span class="text-green-400 text-[10px] font-bold uppercase tracking-widest">Sincronizado</span>
      </div>
    </div>
  </div>
</div>
`;


export default function StrategicAnalysisPage() {

    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            let pid = projectId;
            if (!pid) {
                const project = await getActiveProject();
                if (project) {
                    pid = project.id;
                    setProjectId(project.id);
                } else {
                    // Fallback for dev: try to fetch ANY project
                    console.warn("No active project found, checking API...");
                }
            }

            if (pid) {
                // STRATEGY CHANGE: Use standard 'main' documents filtered by prefix
                // This guarantees we use the working path of the application
                const docs = await listDocuments(pid, 'main');
                const strategyDocs = docs.filter(d => d.title.startsWith('ESTRATEGIA: '));
                setDocuments(strategyDocs);

                // Auto-seed if empty
                if (strategyDocs.length === 0) {
                    // managed in effect
                }
            }
        } catch (e) {
            console.error("Error loading documents:", e);
        } finally {
            setLoading(false);
        }
    };

    // Separate effect for auto-seeding
    useEffect(() => {
        if (!loading && projectId && documents.length === 0) {
            handleSeed();
        }
    }, [loading, projectId, documents.length]);

    useEffect(() => {
        loadDocuments();
    }, []);

    const handleSeed = async () => {
        if (!projectId) return;
        setSeeding(true);
        try {
            // Cleanup existing strategy docs to avoid duplicates/corruption
            // We fetch FRESH list to be sure
            const allDocs = await listDocuments(projectId, 'main');
            const strategyDocs = allDocs.filter(d => d.title.startsWith('ESTRATEGIA: '));

            for (const doc of strategyDocs) {
                await deleteDocument(doc.id);
            }

            // Create fresh documents using STANDARD 'main' category

            // 1. Historical Analysis
            try {
                const doc1 = await createDocument(projectId, 'ESTRATEGIA: Análisis Estratégico (Histórico)', 'main');
                if (doc1) {
                    console.log("Doc 1 created, adding block...");
                    const b1 = await createBlock(doc1.id, STRATEGIC_ANALYSIS_V1, 0, 'Contenido Completo');
                    console.log("Block 1 created result:", b1);
                }
            } catch (err) {
                console.error("Error creating Historical Analysis:", err);
            }

            // 2. New Vision
            try {
                const doc2 = await createDocument(projectId, 'ESTRATEGIA: Plataforma Cognitiva (Nueva Visión)', 'main');
                if (doc2) {
                    console.log("Doc 2 created, adding block...");
                    const b2 = await createBlock(doc2.id, STRATEGIC_ANALYSIS_V2, 0, 'Contenido Completo');
                    console.log("Block 2 created result:", b2);
                }
            } catch (err) {
                console.error("Error creating New Vision:", err);
            }

            // 3. Updated Strategic Briefing (Gemini Pro)
            try {
                const doc3 = await createDocument(projectId, 'ESTRATEGIA: Informe Gemini Pro (Actualizado)', 'main');
                if (doc3) {
                    console.log("Doc 3 created, adding block...");
                    const b3 = await createBlock(doc3.id, STRATEGIC_ANALYSIS_V3, 0, 'Contenido Completo');
                    console.log("Block 3 created result:", b3);
                }
            } catch (err) {
                console.error("Error creating Gemini Pro Briefing:", err);
            }


            // 4. Cognitive AI Plan
            try {
                const doc4 = await createDocument(projectId, 'ESTRATEGIA: Plan Maestro IA (Revolución)', 'main');
                if (doc4) {
                    console.log("Doc 4 created, adding block...");
                    await createBlock(doc4.id, STRATEGIC_ANALYSIS_V4, 0, 'Contenido Completo');
                }
            } catch (err) {
                console.error("Error creating Multi-Agent Plan:", err);
            }

            // 5. Library Strategy
            try {
                const doc5 = await createDocument(projectId, 'ESTRATEGIA: Repositorio Normativo (La Casa del Bibliotecario)', 'main');
                if (doc5) {
                    console.log("Doc 5 created, adding block...");
                    await createBlock(doc5.id, STRATEGIC_ANALYSIS_V5, 0, 'Contenido Completo');
                }
            } catch (err) {
                console.error("Error creating Library Strategy:", err);
            }

            await loadDocuments();

        } catch (e) {
            console.error("Seeding error:", e);
            // Don't alert global error to avoid scaring user if partial success
        } finally {
            setSeeding(false);
        }
    };

    const handleCreate = async () => {
        if (!projectId) return;
        const title = prompt('Título del nuevo documento estratégico:');
        if (!title) return;
        try {
            // Force prefix
            const finalTitle = title.startsWith('ESTRATEGIA:') ? title : `ESTRATEGIA: ${title}`;
            await createDocument(projectId, finalTitle, 'main');
            loadDocuments();
        } catch (e) {
            alert('Error creating document');
        }
    };


    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('¿Eliminar este documento estratégico?')) {
            try {
                await deleteDocument(id);
                loadDocuments();
            } catch (e) {
                alert('Error deleting document');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-4">
                    <Link href="/settings" className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-foreground text-lg">Repositorio Estratégico</h1>
                        <p className="text-xs text-muted-foreground">Planificación, Roadmaps e Ideas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {documents.length === 0 && !loading && (
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm transition-all font-bold"
                        >
                            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            <span>Generar Docs por Defecto</span>
                        </button>
                    )}
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm transition-all font-medium shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Documento</span>
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-12">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-foreground">No hay documentos estratégicos</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Este repositorio está vacío. Puedes crear nuevos documentos o generar los informes estratégicos base del sistema.
                        </p>
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:scale-105 transition-transform"
                        >
                            {seeding ? 'Generando...' : 'Generar Informes Iniciales'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {documents.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/documents/${doc.id}?back=/settings/strategic-analysis`}
                                className="group block p-6 bg-card hover:bg-muted/50 border border-border hover:border-primary/50 rounded-2xl transition-all shadow-sm hover:shadow-md relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(doc.id, e)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar documento"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {doc.title.replace('ESTRATEGIA: ', '')}
                                </h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    Actualizado: {new Date(doc.updated_at).toLocaleDateString()}
                                </p>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    <ExternalLink className="w-5 h-5 text-primary" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Dummy export to suppress strict export checks if any
export const dynamic = 'force-dynamic';
