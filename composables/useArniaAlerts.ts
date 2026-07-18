import type { Misura } from '~/types/database'

export interface MisuraConAlert extends Misura {
  variazioneSospetta: boolean
}

/**
 * Segnala una misura come sospetta quando il peso cambia di oltre 1 kg
 * rispetto alla misura precedente entro poche ore (possibile sciamatura o furto).
 */
const SOGLIA_KG = 1
const FINESTRA_ORE_MAX = 4

export const rilevaVariazioniSospette = (misure: Misura[]): MisuraConAlert[] => {
  const ordinate = [...misure].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return ordinate.map((misura, i) => {
    if (i === 0) return { ...misura, variazioneSospetta: false }

    const precedente = ordinate[i - 1]
    const oreTrascorse =
      (new Date(misura.created_at).getTime() - new Date(precedente.created_at).getTime()) /
      3_600_000
    const deltaKg = Math.abs(misura.peso_kg - precedente.peso_kg)

    const variazioneSospetta =
      oreTrascorse > 0 && oreTrascorse <= FINESTRA_ORE_MAX && deltaKg > SOGLIA_KG

    return { ...misura, variazioneSospetta }
  })
}
