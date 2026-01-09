\# NexDoc AI — Plataforma cognitiva para documentación técnica y jurídica



\## Objetivo

Sistema privado para arquitectos y abogados orientado a:

\- Gestionar documentos largos (contratos, memorias técnicas, informes jurídico-urbanísticos).

\- Mantener trazabilidad entre texto final, borradores/estados procedimentales, recursos y evidencia (extractos anclados).

\- Ofrecer doble interfaz: trabajo 2D (taller) + brújula 3D (árbol sólido por capítulos).



\## Principios de diseño (no negociables)

1\. \*\*Canon por bloques\*\*: el documento se edita y persiste por capítulos/bloques con IDs estables.

2\. \*\*Trazabilidad\*\*: los bloques pueden vincular recursos y extractos (evidencia) con anclaje reproducible.

3\. \*\*Estados/cajas\*\*: el documento evoluciona por estados procedimentales (borrador, presentado, requerido, aprobado…).

4\. \*\*Snapshots sellados\*\*: un estado puede sellarse generando un snapshot reproducible para exportación (DOCX/PDF).

5\. \*\*3D sin maraña\*\*: la vista 3D no es un grafo libre; es un objeto sólido jerárquico (caja + tronco + capítulos + 4 ramas fijas).



\## Stack

\- Frontend: Next.js + TypeScript

\- Backend/DB/Storage/Realtimes: Supabase (Postgres + Storage + Edge Functions)

\- Control de versiones: GitHub (issues + PR + CI)

\- Desarrollo asistido por IA: Antigravity (multiagente)



\## Flujo de trabajo (obligatorio)

\- \*\*1 issue = 1 rama = 1 PR\*\*.

\- No se cambia arquitectura fuera del alcance del issue.

\- Si un cambio afecta a DB: \*\*migración en /supabase/migrations obligatoria\*\*.

\- Todo PR debe incluir: objetivo, alcance IN/OUT, pruebas mínimas y criterios de aceptación.



\## Estructura del repo

\- /docs: briefing y documentación

\- /planning: backlog y planificación

\- /apps/web: aplicación web

\- /apps/worker: worker para exports

\- /packages/shared: tipos/contratos compartidos

\- /supabase: config + migraciones + edge functions



\## Arranque (se completará en Sprint 0)

### Arranque

1. Imstalar dependencias raíz (bootstrap monorepo):
```bash
npm install
```

2. Arrancar entorno de desarrollo:
```bash
npm run dev
```

3. Otros comandos:
- `npm run build`: Compilar todos los paquetes/apps
- `npm run lint`: Verificar linting
- `npm run typecheck`: Verificar tipos TypeScript




