# Informe Autocrítico: Estado Actual de NexDoc AI vs. Utilidad Real

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
