# IA MULTIAGENTE COGNITIVO_PLAN: El Futuro de DOCNEX

Este plan detalla la transformación de DOCNEX de una "herramienta de edición asistida" a un **Socio Cognitivo Adaptativo**, basado en el análisis de arquitecturas de memoria a largo plazo y sistemas multi-agente.

---

## 1. Visión Estratégica: El Salto de Herramienta a Compañero
El objetivo fundamental es eliminar la **falta de estado (statelessness)** de la IA actual. No queremos que el usuario "vuelva a explicar" su estilo o las restricciones de su proyecto en cada sesión. DOCNEX debe poseer **Memoria Episódica** y **Memoria Semántica**.

## 2. Los 3 Pilares del Sistema Nervioso Digital

### A. Capas de Memoria Híbrida (Arquitectura MemGPT)
Implementaremos una jerarquía de memoria para gestionar la complejidad de documentos extensos:
1.  **Memoria Sensorial (Contexto de Sesión):** Lo que ocurre en el chat actual. Baja latencia, limpieza automática.
2.  **Memoria de Trabajo (Grafo del Proyecto):** Almacenada en un **Knowledge Graph (via GraphRAG)**. No solo fragmentos de texto, sino relaciones: *"El bloque B contradice la premisa del bloque A"*.
3.  **Memoria Central (El ADN del Autor):** Un perfil persistente que evoluciona. Si el usuario siempre elimina los adjetivos superfluos, la IA aprende que su "DNA_Style" es *minimalista y directo*.

### B. Retroalimentación Implícita (HITL Granular)
Convertiremos cada clic en datos de aprendizaje:
*   **Logging de Distancia de Edición:** Calcularemos automáticamente cuánto cambia el usuario el texto sugerido por la IA. Un cambio del <10% es una "Validación de Estilo"; un cambio del >50% es un "Fallo de Tono".
*   **Burst Analysis (Ritmo de Escritura):** Tiptap capturará pausas cognitivas. Si el usuario se queda parado 20 segundos frente a un bloque generado, la IA detectará "Fricción de Coherencia" y ofrecerá una sugerencia proactiva.

### C. Orquestación Multi-Agente (La Sala de Redacción)
Sustituiremos el agente único por un equipo especializado que trabaja de forma asíncrona:
*   **Agente Bibliotecario:** Clasifica y fragmenta documentos importados aprendiendo los criterios de división del usuario.
*   **Agente Investigador:** Realiza búsquedas semánticas profundas en el histórico de proyectos para encontrar analogías.
*   **Agente Crítico (Redactor Jefe):** Revisa el texto generado contra el "ADN del Autor" antes de mostrarlo, asegurando coherencia.

---

## 3. Implementación Arquitectónica (Roadmap Técnico)

### Fase 1: Observabilidad Total (Semanas 1-2)
*   **Event Sourcing en PostgreSQL:** Crear una tabla `ai_interaction_logs` que registre: `prompt`, `ai_output`, `user_refined_text`, `edit_distance`, `dwell_time`.
*   **Cómputo de Feedback:** Implementar un worker que analice estos logs cada noche para extraer "Reglas de Estilo" (e.g., *"Prefiere voz activa"*, *"Usa terminología legal española"*).

### Fase 2: Del RAG Vectorial al GraphRAG (Semanas 3-4)
*   Representar el documento como un Grafo. Los nodos son **Blocks** y las aristas son **Relaciones Semánticas** (Soporta, Contradice, Amplía).
*   Esto permitirá responder preguntas complejas: *"¿Cómo afecta este cambio en la cláusula 5 a las definiciones del capítulo 1?"*.

### Fase 3: Integración del Model Context Protocol (MCP) (Semanas 5-6)
*   Implementar un servidor MCP interno que conecte a Gemini con las bases de datos (Supabase/Neo4j) de forma estandarizada.
*   Permitir que la IA "use herramientas" de forma autónoma (e.g., *"Agente, busca todos los informes del 2024 y extrae las tendencias de costes"*).

---

## 4. Características "Wow" (Diferenciación Creativa)

1.  **The Writing Time Machine:** Un visualizador de la evolución del documento donde el usuario puede ver cómo la IA y el humano colaboraron en cada párrafo.
2.  **Adaptive Split Suggestion:** El sistema de importación dejará de ser estático. Si en proyectos previos de "Contratos" dividiste por cláusulas, la IA lo hará automáticamente la próxima vez.
3.  **Proactive Ghostwriter:** En lugar de esperar a un prompt, la IA detecta bloqueos. Si no escribes nada en 1 minuto, aparece un "Fantasma" (texto tenue) con una posible continuación basada en tu estilo histórico.

---

## 5. Próximos Pasos Tácticos para Antigravity

1.  **Refactorizar `AIService`:** Migrar a una arquitectura donde cada llamada a Gemini sea precedida por una consulta al **"User DNA Store"**.
2.  **Instalar Dependencias Críticas:** `langgraph` (para flujos con estado) y explorar adaptadores para un Knowledge Graph ligero.
3.  **Diseñar la UI de "Criterios Aceptados":** Un panel donde el usuario pueda ver y validar lo que la IA cree que ha aprendido sobre él.

---

**"La IA no debe ser una máquina a la que se le dan órdenes, sino un colega que aprende a anticipar tus necesidades."**
