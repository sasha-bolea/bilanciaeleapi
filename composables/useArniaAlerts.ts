import type { Misura } from '~/types/database'

/**
 * Rilevazione sciamatura.
 *
 * Una sciamatura (o un furto) si manifesta come un CALO drastico e improvviso
 * del peso: una parte della popolazione lascia l'arnia e la bilancia registra
 * una perdita di diversi kg in poco tempo. Le normali oscillazioni giorno/notte
 * sono nell'ordine di ±0,3 kg, quindi un calo oltre ~1 kg in poche ore è anomalo.
 *
 * Rispetto a un semplice confronto tra due letture consecutive, qui si guarda
 * il calo rispetto al picco di peso nella finestra oraria precedente: così
 * viene riconosciuto anche un calo distribuito su 2-3 letture, e le soglie
 * restano robuste rispetto al rumore del sensore.
 */

// Calo minimo (kg) perché sia considerato sciamatura.
export const SOGLIA_CALO_KG = 1
// Finestra (ore) entro cui il calo deve avvenire per essere "improvviso".
export const FINESTRA_ORE_MAX = 3

export interface EventoSciamatura {
  /** Misura in cui il calo si completa. */
  misura: Misura
  /** Variazione di peso (negativa) rispetto al picco precedente, in kg. */
  deltaKg: number
  /** Ore trascorse dal picco al minimo. */
  oreTrascorse: number
}

export interface MisuraConAlert extends Misura {
  /** Variazione (kg) rispetto alla lettura precedente; null per la prima. */
  deltaKg: number | null
  /** true se questa misura chiude un evento di sciamatura. */
  sciamatura: boolean
}

const perData = (a: Misura, b: Misura) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

const ore = (da: string, a: string) =>
  (new Date(a).getTime() - new Date(da).getTime()) / 3_600_000

/**
 * Restituisce l'elenco degli eventi di sciamatura rilevati nelle misure fornite.
 * Ogni calo drastico viene segnalato una sola volta.
 */
export const rilevaSciamature = (misure: Misura[]): EventoSciamatura[] => {
  const ordinate = [...misure].sort(perData)
  const eventi: EventoSciamatura[] = []
  let ultimoEventoTime = -Infinity

  for (let i = 1; i < ordinate.length; i++) {
    const corrente = ordinate[i]
    const tCorr = new Date(corrente.created_at).getTime()

    // Cerca il peso massimo nella finestra oraria che precede la misura corrente,
    // senza risalire oltre l'ultimo evento già segnalato (evita doppioni).
    let picco = -Infinity
    let piccoData: string | null = null
    for (let j = i - 1; j >= 0; j--) {
      const tj = new Date(ordinate[j].created_at).getTime()
      if (tj <= ultimoEventoTime) break
      if (ore(ordinate[j].created_at, corrente.created_at) > FINESTRA_ORE_MAX) break
      if (ordinate[j].peso_kg > picco) {
        picco = ordinate[j].peso_kg
        piccoData = ordinate[j].created_at
      }
    }

    if (piccoData === null) continue

    const deltaKg = corrente.peso_kg - picco
    if (deltaKg <= -SOGLIA_CALO_KG) {
      eventi.push({
        misura: corrente,
        deltaKg,
        oreTrascorse: ore(piccoData, corrente.created_at)
      })
      ultimoEventoTime = tCorr
    }
  }

  return eventi
}

/**
 * Annota ogni misura con la variazione rispetto alla precedente e con il flag
 * `sciamatura` (utile per evidenziare i punti sul grafico).
 */
export const annotaMisure = (misure: Misura[]): MisuraConAlert[] => {
  const ordinate = [...misure].sort(perData)
  const idSciamature = new Set(rilevaSciamature(ordinate).map((e) => e.misura.id))

  return ordinate.map((misura, i) => ({
    ...misura,
    deltaKg: i === 0 ? null : misura.peso_kg - ordinate[i - 1].peso_kg,
    sciamatura: idSciamature.has(misura.id)
  }))
}
