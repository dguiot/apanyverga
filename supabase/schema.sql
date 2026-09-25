-- ============================================================
--  A pan y verga · base de datos de la versión web
--  Supabase → SQL Editor → New query → pega todo esto → Run. Se puede correr más de una vez.
--
--  apyv_players  el nombre que escribe cada quien (uno por sesión anónima)
--  apyv_docs     las peleas online del salón de la fama
--
--  Seguridad (RLS): cualquiera puede LEER. Solo una sesión puede AGREGAR lo suyo:
--  su propio nombre, y peleas en las que ella misma peleó. Nadie puede cambiar ni borrar peleas
--  desde el juego. Las salas en vivo (Realtime) no usan tablas: no guardan nada.
-- ============================================================

create table if not exists public.apyv_players (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  updated_at timestamptz not null default now()
);

create table if not exists public.apyv_docs (
  coll text not null check (coll in ('matches')),
  id text not null check (char_length(id) between 1 and 64),
  body jsonb not null check (octet_length(body::text) < 8000),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists apyv_docs_recent on public.apyv_docs (coll, created_at desc);

alter table public.apyv_players enable row level security;
alter table public.apyv_docs enable row level security;

drop policy if exists "apyv_players leer" on public.apyv_players;
drop policy if exists "apyv_players crear el mio" on public.apyv_players;
drop policy if exists "apyv_players cambiar el mio" on public.apyv_players;
create policy "apyv_players leer" on public.apyv_players for select to anon, authenticated using (true);
create policy "apyv_players crear el mio" on public.apyv_players for insert to authenticated with check (id = auth.uid());
create policy "apyv_players cambiar el mio" on public.apyv_players for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "apyv_docs leer" on public.apyv_docs;
drop policy if exists "apyv_docs agregar las mias" on public.apyv_docs;
create policy "apyv_docs leer" on public.apyv_docs for select to anon, authenticated using (true);
-- solo quien peleó puede guardar la pelea (su id tiene que venir entre los jugadores)
create policy "apyv_docs agregar las mias" on public.apyv_docs for insert to authenticated
  with check (owner = auth.uid() and body -> 'players' @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text)));
-- sin políticas de update ni delete: desde el juego no se cambian ni se borran

grant select on public.apyv_players, public.apyv_docs to anon, authenticated;
grant insert, update on public.apyv_players to authenticated;
grant insert on public.apyv_docs to authenticated;
