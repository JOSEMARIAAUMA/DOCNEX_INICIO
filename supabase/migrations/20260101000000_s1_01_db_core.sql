-- S1-01 — DB core: documents por bloques + recursos + enlaces

-- Extensions
create extension if not exists pgcrypto;

-- 1) Workspaces (contenedor lógico)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Projects (expediente/proyecto dentro de workspace)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace_id on public.projects(workspace_id);

-- 3) Documents (documento dentro de project)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'draft', -- draft/presented/review/approved/etc. (mínimo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_project_id on public.documents(project_id);

-- 4) Document blocks (capítulos/apartados del documento)
create table if not exists public.document_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  order_index integer not null,
  title text not null,
  content text not null default '',
  last_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_document_blocks_order unique (document_id, order_index)
);

create index if not exists idx_document_blocks_document_id on public.document_blocks(document_id);

-- 5) Resources (fuentes: PDF/DOCX/URL/nota; solo metadata en MVP)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,         -- pdf|docx|url|note|image|other
  title text not null,
  source_uri text,            -- url o ruta lógica (storage se definirá después)
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resources_project_id on public.resources(project_id);
create index if not exists idx_resources_kind on public.resources(kind);

-- 6) Resource extracts (citas/extractos anclados)
create table if not exists public.resource_extracts (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  label text,                 -- etiqueta humana (p.ej. "art. 22 LISTA")
  excerpt text not null,      -- texto del extracto/cita
  locator jsonb not null default '{}'::jsonb, -- anclaje: página, párrafo, coords, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resource_extracts_resource_id on public.resource_extracts(resource_id);

-- 7) Block <-> Resource links (N:N entre bloque y extracto/recurso)
create table if not exists public.block_resource_links (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.document_blocks(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  extract_id uuid references public.resource_extracts(id) on delete set null,
  relation text not null default 'supports',  -- supports|cites|contradicts|todo|reference
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_block_resource_links_block_id on public.block_resource_links(block_id);
create index if not exists idx_block_resource_links_resource_id on public.block_resource_links(resource_id);
create index if not exists idx_block_resource_links_extract_id on public.block_resource_links(extract_id);
