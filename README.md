# Bilance Arnie

Dashboard mobile-first per il monitoraggio del peso di arnie tramite bilance
IoT (ESP32, in arrivo). Questa prima versione usa dati finti generati via
script di seed: **niente autenticazione, niente Edge Function, niente
endpoint di ingestione** — arriveranno in una fase successiva.

## Stack

- [Nuxt 3](https://nuxt.com) (Composition API, `<script setup>`)
- [Supabase](https://supabase.com) (Postgres) via `@supabase/supabase-js`
- [Chart.js](https://www.chartjs.org) (tramite `vue-chartjs`)
- CSS semplice, nessuna libreria UI pesante

## Struttura del database

Migration: [`supabase/migrations/20260718120000_create_arnie_misure.sql`](./supabase/migrations/20260718120000_create_arnie_misure.sql)

- **`arnie`**: `id` (text, pk, es. `"A1"`), `nome`, `note`
- **`misure`**: `id` (uuid, pk), `created_at` (timestamptz), `arnia_id` (fk
  → `arnie.id`), `peso_kg`, `batteria_v`, `temperatura_c` (nullable)

Entrambe le tabelle hanno la Row Level Security abilitata con una policy di
sola lettura pubblica (`select`), così la dashboard può leggere con la
chiave `anon` senza che nessuno possa scrivere dal client finché non arriva
l'ingestione autenticata dai dispositivi.

### Applicare la migration

Con la [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <il-tuo-project-ref>
supabase db push
```

In alternativa, incolla il contenuto del file `.sql` nel SQL Editor del
progetto Supabase (Dashboard → SQL Editor).

## Dati finti (seed)

Lo script [`scripts/seed.mjs`](./scripts/seed.mjs) genera ~30 giorni di
letture orarie per 3 arnie (`A1`, `A2`, `A3`) con:

- peso base tra 35 e 50 kg con crescita lenta giornaliera (accumulo di
  nettare, con piccola variazione giorno per giorno)
- oscillazione giorno/notte di ±0.3 kg (minimo nel primo pomeriggio,
  massimo di notte)
- rumore di lettura realistico sul peso, sulla batteria e sulla temperatura
- batteria che si scarica lentamente nel tempo (con piccolo recupero
  diurno simulato, es. pannello solare)
- temperatura interna arnia (~34-35°C) solo per le arnie con sensore —
  `A3` non ha il sensore, per testare il caso "grafico assente"
- una **sciamatura simulata** sull'arnia `A2`: calo improvviso di 1.5 kg
  in un'ora, circa a metà del periodo generato

Lo script è idempotente: ad ogni esecuzione elimina le misure esistenti
delle 3 arnie e le rigenera.

```bash
npm run seed
```

Richiede nel `.env` (root del progetto, vedi `.env.example`):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

La `service_role` key bypassa la RLS ed è necessaria solo per lo script di
seed lato server/locale: **non va mai esposta al client né committata**.

## Sviluppo locale

```bash
npm install
cp .env.example .env   # compila con le tue chiavi Supabase
npm run seed            # popola il database con dati finti
npm run dev
```

L'app parte su `http://localhost:3000`.

## Variabili d'ambiente

| Variabile | Dove si usa | Descrizione |
|---|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | App (client + server) | URL del progetto Supabase |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | App (client + server) | Chiave `anon public`, protetta dalla RLS (sola lettura) |
| `SUPABASE_URL` | Solo `scripts/seed.mjs` | Stesso URL del progetto |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo `scripts/seed.mjs` | Chiave `service_role`, bypassa la RLS — mai nel client |

Tutti i valori si trovano in Supabase → Project Settings → API.

## Deploy su Vercel

1. Importa il repository su Vercel (framework preset: **Nuxt**, rilevato
   automaticamente).
2. In Project Settings → Environment Variables aggiungi:
   - `NUXT_PUBLIC_SUPABASE_URL`
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY`

   (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **non** servono su Vercel:
   sono usate solo dallo script di seed, da eseguire in locale.)
3. Applica la migration SQL e lancia `npm run seed` in locale puntando al
   progetto Supabase di produzione (o a un progetto/branch dedicato) prima
   del primo deploy, così la dashboard ha dati da mostrare.
4. Deploy.

## Cosa manca volutamente (prossimi passi)

- Ingestione dati dai dispositivi ESP32 reali (endpoint/Edge Function)
- Autenticazione
- Notifiche push/email sulle variazioni sospette (oggi solo evidenziate in UI)
