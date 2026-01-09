'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, FileText, Share, Check } from 'lucide-react';
import Link from 'next/link';

const STRATEGIC_ANALYSIS_MARKDOWN = `# Análisis Estratégico DOCNEX
## Plataforma Cognitiva para Documentación Técnica y Jurídica

---

## 1. RESUMEN EJECUTIVO

**Visión**: DOCNEX aspira a ser el "GitHub para documentos largos", transformando la gestión caótica de documentos técnicos y jurídicos en un sistema centralizado, versionado y trazable.

**Propuesta de Valor Única**: Convertir documentos extensos en árboles estructurados donde cada elemento (capítulo, versión, nota, recurso) es un nodo navegable y relacionable, superando la dispersión actual de información en múltiples archivos y herramientas.

**Mercado Objetivo**: Arquitectos, abogados, ingenieros e investigadores que gestionan documentos complejos (contratos, memorias técnicas, informes jurídico-urbanísticos, tesis, libros técnicos).

---

## 2. ESTADO ACTUAL DE LA APLICACIÓN

### 2.1 Arquitectura Implementada

**Stack Tecnológico**:
- Frontend: Next.js + TypeScript + TailwindCSS
- Backend: Supabase (PostgreSQL + Storage + Edge Functions)
- Editor: TipTap (rich text editing)
- Control de versiones: Git para código

**Modelo de Datos Core**:
\`\`\`
Workspace → Project → Document → Blocks
                              ↓
                    Resources (PDFs, URLs, notas)
                              ↓
                    Extracts (fragmentos anclados)
                              ↓
                    Links (trazabilidad block ↔ resource)
\`\`\`

### 2.2 Funcionalidades Implementadas ✅

**Gestión de Bloques**:
- ✅ Creación, edición, eliminación (soft delete) de bloques
- ✅ Reordenamiento mediante drag-and-drop
- ✅ Duplicación y fusión de bloques
- ✅ División de bloques por selección
- ✅ Editor rico con Markdown y formato avanzado

**Versionado**:
- ✅ Sistema de versiones por bloque (\`BlockVersion\`)
- ✅ Comparación visual de versiones
- ✅ Restauración de versiones anteriores
- ✅ Historial completo con timestamps

**Notas y Anotaciones**:
- ✅ Creación de notas vinculadas a bloques
- ✅ Tipos de notas (review, AI instruction, etc.)
- ✅ Sistema de comentarios con selección de texto

**Recursos y Trazabilidad**:
- ✅ Gestión de recursos externos (PDF, DOCX, URLs)
- ✅ Extractos de recursos con anclaje (locator)
- ✅ Enlaces block ↔ resource con relaciones semánticas (supports, cites, contradicts)
- ✅ Metadatos y tags en recursos

**Importación AI**:
- ✅ Wizard de importación con análisis IA
- ✅ Estrategias de división: por H2, semántica, manual
- ✅ Clasificación automática (active version, reference, note)

**UI/UX**:
- ✅ Layout de 3 paneles (bloques, editor, panel lateral)
- ✅ Panel lateral colapsable con secciones (Notas, Versiones, Recursos)
- ✅ Navegación fluida entre bloques

---

## 3. INVESTIGACIÓN COMPETITIVA

### 3.1 Panorama del Mercado

**Soluciones Parciales Existentes**:

| Categoría | Herramientas | Fortalezas | Debilidades |
|-----------|-------------|------------|-------------|
| **Editores Colaborativos** | Google Docs, Notion, Confluence | Colaboración en tiempo real | Sin versionado robusto, sin trazabilidad de fuentes |
| **Control de Versiones** | Git + Markdown, Overleaf | Versionado completo | Curva de aprendizaje, no visual |
| **Gestión Documental** | SharePoint, Documentum | Centralización empresarial | Orientado a almacenamiento, no a creación |
| **Automatización Legal** | HotDocs, Knackly, Conga | Templates inteligentes, batch | Solo para documentos formularios |
| **Técnicos/Académicos** | Scrivener, Ulysses, Zotero | Estructuración de libros | Sin colaboración, sin trazabilidad |
| **IA Generativa** | ChatGPT, Claude, NotebookLM | Generación rápida | Contenido disperso, sin persistencia estructurada |

**Conclusión**: Ninguna solución integra versionado granular + trazabilidad de fuentes + estructura arbórea + colaboración + IA en un solo ecosistema.

### 3.2 Ventajas Competitivas de DOCNEX

1. **Granularidad por Bloques**: Versionado y trazabilidad a nivel de capítulo/sección, no de documento completo
2. **Trazabilidad Semántica**: Relaciones tipificadas entre contenido y fuentes (cites, supports, contradicts)
3. **Árbol Sólido 3D** (roadmap): Visualización no como grafo caótico sino como objeto estructurado
4. **Estados Procedimentales**: Workflow de gestión documental (borrador, presentado, requerido, aprobado)
5. **Snapshots Sellados**: Congelar versiones específicas para exportación oficial
6. **Integración IA Nativa**: Importación inteligente + sugerencias contextuales

---

## 4. FUNCIONALIDADES AVANZADAS - ROADMAP ESTRATÉGICO

### 4.1 NIVEL 1: Optimización de Core Features (Q1 2026)

#### A. Mejoras Urgentes de UX
- **Editor de Bloques Mejorado**:
  - Inline editing de títulos de bloque (sin modal)
  - Shortcuts de teclado avanzados (Cmd+K para comandos)
  - Vista previa Markdown en panel lateral
  
- **Navegación Optimizada**:
  - Breadcrumbs de contexto (Workspace > Project > Document > Block)
  - Minimapa de documento (outline con scroll sincronizado)
  - Búsqueda global en todos los bloques del documento

- **Versionado Visual**:
  - Timeline horizontal de versiones con preview
  - Diff lado a lado con resaltado de cambios
  - Tags en versiones (draft, reviewed, approved)

#### B. Sincronización Robusta
- Actualización en tiempo real con Supabase Realtime
- Resolución de conflictos de edición concurrente
- Guardado automático con indicador visual

#### C. Export Mejorado
- Generación DOCX con estilos preservados
- Export PDF con tabla de contenidos y metadatos
- Templates personalizables por tipo de documento

---

## 5. ARQUITECTURA TÉCNICA PROPUESTA

### 5.1 Backend Enhancements

#### Database Schema Extensions
\`\`\`sql
-- Estados procedimentales
CREATE TABLE document_states (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  state_name TEXT, -- 'draft', 'submitted', 'under_review', 'approved'
  entered_at TIMESTAMP,
  metadata JSONB -- datos contextuales del estado
);
\`\`\`

---

## 6. DIFERENCIACIÓN COMPETITIVA

### 6.1 Lo que DOCNEX hace que nadie más hace

1. **Trazabilidad Epistemológica**: Cada afirmación del documento está vinculada a su fuente con tipo de relación semántica

2. **Versionado Granular con Contexto**: No solo guardas versiones, sino que comparas, fusionas y entiendes el "por qué" del cambio

3. **IA como Asistente de Investigación**: No genera texto genérico, sino que analiza TUS recursos y TUS versiones para sugerir mejoras contextuales

4. **Visualización Estructurada**: El "árbol sólido" permite navegar documentos de 200+ páginas sin perderse

5. **Workflow Jurídico/Técnico Nativo**: Estados procedimentales diseñados para trámites administrativos y legales

---

## 7. ESTRATEGIA DE GO-TO-MARKET

### 7.1 Segmentos Prioritarios

**Primario (Año 1)**:
- Despachos de abogados (5-20 abogados)
- Estudios de arquitectura (3-15 arquitectos)
- Consultoras de ingeniería (gestión de memorias técnicas)

**Secundario (Año 2)**:
- Departamentos legales corporativos
- Investigadores académicos (tesis doctorales)
- Autores técnicos (libros técnicos, manuales)

---

## 8. ROADMAP DE IMPLEMENTACIÓN

### Fase 1: Fundamentos Sólidos (Meses 1-3)
- ✅ Completar sincronización robusta
- ✅ Rediseño UI/UX moderno
- ✅ Sistema de export mejorado
- ✅ Testing exhaustivo de versionado

---

## 12. CONCLUSIÓN

DOCNEX tiene el potencial de convertirse en la solución definitiva para profesionales que gestionan documentos complejos.

**La ventaja competitiva no está en hacer TODO, sino en hacer ESTO mejor que nadie**: convertir el caos documental en un sistema estructurado, versionado, trazable y visualmente navegable.

**El momento es ahora**: La IA está madura, los usuarios están saturados de herramientas fragmentadas, y el mercado está listo para una solución holística.

---
*Documento estratégico v1.0*
`;

export default function StrategicAnalysisPage() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-20 transition-colors">
            {/* Header Fijo */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-4">
                    <Link href="/settings" className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h1 className="font-bold text-foreground">Análisis Estratégico</h1>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm transition-all font-medium shadow-sm">
                    <Share className="w-4 h-4" />
                    <span>Compartir</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-8 pt-12 pb-24">
                <article className="prose prose-neutral dark:prose-invert max-w-none 
          prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-4xl prose-h1:mb-10
          prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
          prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4
          prose-p:text-muted-foreground dark:prose-p:text-muted-foreground/90 prose-p:leading-relaxed prose-p:mb-6
          prose-strong:text-foreground
          prose-ul:my-6 prose-li:mb-2 prose-li:text-muted-foreground
          prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:text-foreground
          prose-table:border prose-table:border-border prose-table:rounded-xl prose-table:overflow-hidden
          prose-th:bg-muted prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-foreground
          prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-border prose-td:text-muted-foreground
          prose-hr:border-border prose-hr:my-16
        ">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => {
                                if (typeof children === 'string' && children.includes('✅')) {
                                    return (
                                        <p className="flex items-center gap-2 mb-6 leading-relaxed">
                                            {children.split('✅').map((part, i, arr) => (
                                                <React.Fragment key={i}>
                                                    {part}
                                                    {i < arr.length - 1 && <Check className="w-5 h-5 text-emerald-500 shrink-0" />}
                                                </React.Fragment>
                                            ))}
                                        </p>
                                    );
                                }
                                return <p className="mb-6 leading-relaxed">{children}</p>;
                            },
                            li: ({ children }) => {
                                // Check if the content contains a checkmark emoji
                                const content = children;
                                if (Array.isArray(content)) {
                                    const hasCheck = content.some(c => typeof c === 'string' && c.includes('✅'));
                                    if (hasCheck) {
                                        return (
                                            <li className="flex items-start gap-2 mb-2 list-none">
                                                <Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                                                <span>
                                                    {content.map((c, i) => (
                                                        typeof c === 'string' ? c.replace(/✅/g, '') : c
                                                    ))}
                                                </span>
                                            </li>
                                        );
                                    }
                                } else if (typeof content === 'string' && content.includes('✅')) {
                                    return (
                                        <li className="flex items-start gap-2 mb-2 list-none">
                                            <Check className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                                            <span>{content.replace(/✅/g, '')}</span>
                                        </li>
                                    );
                                }
                                return <li className="mb-2">{children}</li>;
                            },
                            h2: ({ children, ...props }) => {
                                const textContent = React.Children.toArray(children).join('');
                                if (textContent.includes('✅')) {
                                    return (
                                        <h2 {...props} className="text-2xl mt-16 mb-6 border-b border-border pb-2 flex items-center gap-2 font-bold tracking-tight text-foreground">
                                            {textContent.replace('✅', '').trim()}
                                            <Check className="w-6 h-6 text-emerald-500" />
                                        </h2>
                                    );
                                }
                                return <h2 {...props}>{children}</h2>;
                            }
                        }}
                    >
                        {STRATEGIC_ANALYSIS_MARKDOWN}
                    </ReactMarkdown>
                </article>
            </div>

            {/* Floating Gradient */}
            <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
    );
}
