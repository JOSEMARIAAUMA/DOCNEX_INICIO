\# Reglas para Antigravity (multiagente)



1\) Trabajar siempre desde una rama por issue: 1 issue = 1 branch = 1 PR.

2\) No modificar archivos fuera del alcance del issue.

3\) Cambios de DB solo por migraciones en /supabase/migrations (nunca SQL suelto no versionado).

4\) No introducir CRDT/Yjs ni colaboración en edición simultánea en MVP salvo issue explícito.

5\) La vista 3D no es grafo libre: caja + tronco + capítulos + 4 ramas fijas.

6\) No cambiar la estructura del repo (/apps, /packages, /supabase) sin issue/ADR.

7\) Cada PR debe pasar lint/typecheck/build y describir pruebas manuales.



