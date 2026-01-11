-- Create tag_blacklist table
create table if not exists tag_blacklist (
  id uuid default gen_random_uuid() primary key,
  tag_text text not null unique,
  project_id uuid references projects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table tag_blacklist enable row level security;

create policy "Users can view their project blacklists"
  on tag_blacklist for select
  using (
    exists (
      select 1 from projects
      where projects.id = tag_blacklist.project_id
    )
  );

create policy "Users can insert into their project blacklists"
  on tag_blacklist for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = tag_blacklist.project_id
    )
  );

create policy "Users can delete from their project blacklists"
  on tag_blacklist for delete
  using (
    exists (
      select 1 from projects
      where projects.id = tag_blacklist.project_id
    )
  );
