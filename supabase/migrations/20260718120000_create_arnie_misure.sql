-- Monitoraggio peso arnie: tabelle base "arnie" e "misure".
-- Nessuna Edge Function, autenticazione o endpoint di ingestione: verranno aggiunti in seguito.

create extension if not exists "pgcrypto";

-- Anagrafica arnie -----------------------------------------------------

create table if not exists public.arnie (
  id text primary key,
  nome text not null,
  note text
);

comment on table public.arnie is 'Anagrafica delle arnie monitorate.';

-- Misure delle bilance IoT ----------------------------------------------

create table if not exists public.misure (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  arnia_id text not null references public.arnie (id) on delete cascade,
  peso_kg numeric not null,
  batteria_v numeric not null,
  temperatura_c numeric
);

comment on table public.misure is 'Letture periodiche inviate dalle bilance IoT (peso, batteria, temperatura).';

-- La dashboard interroga sempre "ultime misure di un'arnia" e
-- "misure di un'arnia in un intervallo di tempo": un indice composito
-- copre entrambi i casi.
create index if not exists misure_arnia_id_created_at_idx
  on public.misure (arnia_id, created_at desc);

-- Row Level Security ------------------------------------------------------
-- Non c'è ancora autenticazione: la dashboard legge con la chiave anon.
-- Si abilita comunque la RLS con policy di sola lettura, cosi' nessuno
-- puo' scrivere dal client finche' non arriva l'ingestione autenticata.

alter table public.arnie enable row level security;
alter table public.misure enable row level security;

create policy "Lettura pubblica arnie" on public.arnie
  for select
  using (true);

create policy "Lettura pubblica misure" on public.misure
  for select
  using (true);
