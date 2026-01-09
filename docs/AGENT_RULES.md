# Reglas para Antigravity (multiagente)

## Flujo
1 issue = 1 rama = 1 PR hacia `dev`.
No se empuja a `main`.

## Alcance por sprints
- Sprint 0: bootstrap repo + CI + Supabase local.
- Sprint 1+: features.

## Prohibiciones (salvo issue explícito)
- No reestructurar el repo.
- No introducir CRDT/Yjs, colaboración en edición simultánea, ni editor avanzado.
- No introducir 3D ni grafos.
- No tocar Supabase remoto.

## DB
Todo cambio de esquema debe ir en `/supabase/migrations`.
Nunca SQL suelto no versionado.

## Entrega
Cada PR debe incluir:
- objetivo
- IN/OUT
- pruebas mínimas



