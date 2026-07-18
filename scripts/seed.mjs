// Genera ~30 giorni di dati finti ma realistici per 3 arnie e li inserisce
// in Supabase. Pensato per l'uso locale, in attesa dei dispositivi ESP32 reali.
//
// Uso:
//   npm run seed
//
// Richiede nel .env (root del progetto):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (bypassa la RLS, mai esporla al client)

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv()

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Mancano SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY nel .env. Vedi .env.example.'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const GIORNI = 30
const ORE_TOTALI = GIORNI * 24
const ORA_MS = 60 * 60 * 1000

const ARNIE = [
  {
    id: 'A1',
    nome: 'Arnia 1 - Frutteto',
    note: 'Vicino al meleto, esposizione sud.',
    pesoBase: 38,
    crescitaMediaKgGiorno: 0.06,
    haSensoreTemperatura: true,
    sciamatura: null
  },
  {
    id: 'A2',
    nome: 'Arnia 2 - Bosco',
    note: 'Bordo bosco, ombreggiata nel pomeriggio.',
    pesoBase: 45,
    crescitaMediaKgGiorno: 0.05,
    haSensoreTemperatura: true,
    // sciamatura simulata: calo improvviso di 1.5kg ~15h prima della fine,
    // cosi' e' visibile in home (variazione 24h) e in tutti i periodi.
    sciamatura: { orePrimaFine: 15, caloKg: 1.5 }
  },
  {
    id: 'A3',
    nome: 'Arnia 3 - Collina',
    note: 'Sensore di temperatura non ancora installato.',
    pesoBase: 41,
    crescitaMediaKgGiorno: 0.07,
    haSensoreTemperatura: false,
    sciamatura: null
  }
]

// Rumore gaussiano (Box-Muller) per letture più realistiche del semplice random uniforme.
function rumoreGaussiano(deviazioneStd) {
  const u1 = Math.random() || 1e-9
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z * deviazioneStd
}

function generaMisureArnia(arnia, timestamps) {
  // Incremento di peso giornaliero: crescita lenta con piccola variazione
  // giorno per giorno (random walk con drift positivo), per evitare una
  // retta perfettamente lineare.
  const crescitaGiornaliera = []
  let cumulata = 0
  for (let g = 0; g < GIORNI; g++) {
    cumulata += Math.max(0, arnia.crescitaMediaKgGiorno + rumoreGaussiano(0.02))
    crescitaGiornaliera.push(cumulata)
  }

  const sciamaturaTimestamp = arnia.sciamatura
    ? timestamps[timestamps.length - 1 - arnia.sciamatura.orePrimaFine]
    : null

  const misure = []

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i]
    const giornoIndex = Math.floor(i / 24)
    const oraDelGiorno = t.getHours()

    // Trend di crescita (nettare accumulato nei giorni precedenti).
    let trend = arnia.pesoBase + crescitaGiornaliera[giornoIndex]

    // Sciamatura: calo permanente di peso da quel momento in poi
    // (l'arnia perde definitivamente una parte della popolazione).
    if (sciamaturaTimestamp && t >= sciamaturaTimestamp) {
      trend -= arnia.sciamatura.caloKg
    }

    // Oscillazione giorno/notte: minimo nel primo pomeriggio (bottinatrici
    // fuori dall'arnia), massimo in tarda serata/notte (rientro e nettare
    // immagazzinato). Ampiezza ±0.3 kg come richiesto.
    const oscillazione = -0.3 * Math.cos((2 * Math.PI * (oraDelGiorno - 15)) / 24)

    // Rumore di lettura del sensore.
    const rumoreLettura = rumoreGaussiano(0.04)

    const pesoKg = Number((trend + oscillazione + rumoreLettura).toFixed(3))

    // Batteria: scarica lenta nel tempo con piccolo recupero diurno (pannello
    // solare) e rumore di lettura.
    const decadimento = 0.45 * (giornoIndex / GIORNI)
    const recuperoSolare = 0.03 * Math.max(0, Math.sin((2 * Math.PI * (oraDelGiorno - 6)) / 24))
    const batteriaV = Number(
      Math.min(4.2, Math.max(3.5, 4.1 - decadimento + recuperoSolare + rumoreGaussiano(0.01))).toFixed(3)
    )

    // Temperatura interna arnia (covata): stabile intorno a 34-35°C con
    // piccola oscillazione giornaliera, solo per le arnie con sensore.
    const temperaturaC = arnia.haSensoreTemperatura
      ? Number(
          (34.5 + 0.8 * Math.sin((2 * Math.PI * (oraDelGiorno - 14)) / 24) + rumoreGaussiano(0.25)).toFixed(2)
        )
      : null

    misure.push({
      created_at: t.toISOString(),
      arnia_id: arnia.id,
      peso_kg: pesoKg,
      batteria_v: batteriaV,
      temperatura_c: temperaturaC
    })
  }

  return misure
}

async function main() {
  const ora = new Date()
  ora.setMinutes(0, 0, 0)
  const inizio = new Date(ora.getTime() - (ORE_TOTALI - 1) * ORA_MS)

  const timestamps = Array.from(
    { length: ORE_TOTALI },
    (_, i) => new Date(inizio.getTime() + i * ORA_MS)
  )

  console.log(`Genero ${ORE_TOTALI} letture/arnia dal ${inizio.toISOString()} al ${ora.toISOString()}`)

  console.log('Upsert anagrafica arnie...')
  const { error: arnieError } = await supabase.from('arnie').upsert(
    ARNIE.map(({ id, nome, note }) => ({ id, nome, note })),
    { onConflict: 'id' }
  )
  if (arnieError) throw arnieError

  for (const arnia of ARNIE) {
    console.log(`Pulisco le misure esistenti per ${arnia.id}...`)
    const { error: deleteError } = await supabase.from('misure').delete().eq('arnia_id', arnia.id)
    if (deleteError) throw deleteError

    const misure = generaMisureArnia(arnia, timestamps)

    console.log(`Inserisco ${misure.length} misure per ${arnia.id}...`)
    const DIMENSIONE_BATCH = 500
    for (let i = 0; i < misure.length; i += DIMENSIONE_BATCH) {
      const batch = misure.slice(i, i + DIMENSIONE_BATCH)
      const { error: insertError } = await supabase.from('misure').insert(batch)
      if (insertError) throw insertError
    }

    if (arnia.sciamatura) {
      const ts = timestamps[timestamps.length - 1 - arnia.sciamatura.orePrimaFine]
      console.log(
        `  -> Sciamatura simulata su ${arnia.id} alle ${ts.toISOString()} (-${arnia.sciamatura.caloKg} kg)`
      )
    }
  }

  console.log('Seed completato.')
}

main().catch((err) => {
  console.error('Seed fallito:', err)
  process.exit(1)
})
