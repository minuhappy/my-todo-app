-- Supabase SQL Editor에서 한 번 실행하세요.
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "Allow anon read todos"
  on public.todos for select to anon using (true);
create policy "Allow anon insert todos"
  on public.todos for insert to anon with check (true);
create policy "Allow anon update todos"
  on public.todos for update to anon using (true) with check (true);
create policy "Allow anon delete todos"
  on public.todos for delete to anon using (true);

create index if not exists todos_order_index on public.todos (order_index);
create index if not exists todos_created_at on public.todos (created_at);
