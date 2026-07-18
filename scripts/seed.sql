-- Seed in SQL puro: ~30 giorni di letture orarie per 3 arnie.
-- Alternativa a scripts/seed.mjs che NON richiede la service_role key:
-- puo' essere eseguito nel SQL Editor di Supabase o via connettore MCP.
--
-- Idempotente: reinserisce l'anagrafica e rigenera le misure delle 3 arnie.
-- La stessa logica dello script Node: crescita lenta, oscillazione giorno/notte
-- di +/-0.3 kg, batteria in scarica con recupero solare, temperatura solo per
-- le arnie con sensore e una sciamatura simulata (-1.5 kg) sull'arnia A2.

begin;

insert into public.arnie (id, nome, note) values
  ('A1', 'Arnia 1 - Frutteto',  'Vicino al meleto, esposizione sud.'),
  ('A2', 'Arnia 2 - Bosco',     'Bordo bosco, ombreggiata nel pomeriggio.'),
  ('A3', 'Arnia 3 - Collina',   'Sensore di temperatura non ancora installato.')
on conflict (id) do update
  set nome = excluded.nome,
      note = excluded.note;

delete from public.misure where arnia_id in ('A1', 'A2', 'A3');

with params as (
  select
    date_trunc('hour', now())                          as fine,
    date_trunc('hour', now()) - interval '719 hours'   as inizio
),
arnie_cfg as (
  -- arnia_id, peso base (kg), crescita media (kg/giorno), sensore temp?,
  -- ore prima della fine in cui simulare la sciamatura (null = nessuna).
  -- A2 sciama ~15h fa, cosi' l'allarme e' visibile in home (finestra 24h).
  select * from (values
    ('A1', 38.0::numeric, 0.06::numeric, true,  null::int),
    ('A2', 45.0::numeric, 0.05::numeric, true,  15),
    ('A3', 41.0::numeric, 0.07::numeric, false, null::int)
  ) as t(arnia_id, peso_base, crescita, has_temp, swarm_ore_prima)
),
serie as (
  select generate_series(0, 719) as i
),
righe as (
  select
    p.inizio + (s.i * interval '1 hour') as ts,
    a.arnia_id,
    a.peso_base,
    a.crescita,
    a.has_temp,
    floor(s.i / 24.0) as giorno,
    case
      when a.swarm_ore_prima is not null
       and p.inizio + (s.i * interval '1 hour')
           >= p.fine - (a.swarm_ore_prima * interval '1 hour')
      then -1.5 else 0
    end as calo_sciamatura
  from serie s
  cross join arnie_cfg a
  cross join params p
)
insert into public.misure (created_at, arnia_id, peso_kg, batteria_v, temperatura_c)
select
  ts,
  arnia_id,
  round((
    peso_base
    + crescita * giorno
    + calo_sciamatura
    - 0.3 * cos(2 * pi() * (extract(hour from ts) - 15) / 24)   -- oscillazione giorno/notte
    + (random() - 0.5) * 0.08                                    -- rumore di lettura
  )::numeric, 3) as peso_kg,
  round((
    least(4.2, greatest(3.5,
      4.1
      - 0.45 * (giorno / 30.0)                                                 -- scarica lenta
      + 0.03 * greatest(0, sin(2 * pi() * (extract(hour from ts) - 6) / 24))   -- recupero solare diurno
      + (random() - 0.5) * 0.02
    ))
  )::numeric, 3) as batteria_v,
  case when has_temp then
    round((
      34.5
      + 0.8 * sin(2 * pi() * (extract(hour from ts) - 14) / 24)
      + (random() - 0.5) * 0.5
    )::numeric, 2)
  else null end as temperatura_c
from righe;

commit;
