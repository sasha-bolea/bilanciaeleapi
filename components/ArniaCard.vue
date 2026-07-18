<script setup lang="ts">
import type { Arnia, Misura } from '~/types/database'
import { rilevaSciamature } from '~/composables/useArniaAlerts'

const props = defineProps<{
  arnia: Arnia
  // Misure delle ultime ~25 ore, ordinate per data crescente.
  misureRecenti: Misura[]
}>()

const ultima = computed(() => props.misureRecenti.at(-1) ?? null)
const primaNelleUltime24h = computed(() => props.misureRecenti.at(0) ?? null)

const variazioneKg = computed(() => {
  if (!ultima.value || !primaNelleUltime24h.value) return null
  return ultima.value.peso_kg - primaNelleUltime24h.value.peso_kg
})

const direzione = computed<'su' | 'giu' | 'stabile'>(() => {
  if (variazioneKg.value === null) return 'stabile'
  if (variazioneKg.value > 0.05) return 'su'
  if (variazioneKg.value < -0.05) return 'giu'
  return 'stabile'
})

const sciamature = computed(() => rilevaSciamature(props.misureRecenti))
const haAllerta = computed(() => sciamature.value.length > 0)
const caloSciamatura = computed(() => sciamature.value.at(-1)?.deltaKg ?? null)

const batteriaBassa = computed(() => (ultima.value?.batteria_v ?? 99) < 3.6)

const formattaPeso = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1))
const formattaVariazione = (v: number | null) => {
  if (v === null) return '—'
  const segno = v > 0 ? '+' : ''
  return `${segno}${v.toFixed(2)} kg`
}
</script>

<template>
  <NuxtLink
    :to="`/arnie/${arnia.id}`"
    class="arnia-card"
    :class="{ 'arnia-card--allerta': haAllerta }"
  >
    <div class="arnia-card__intestazione">
      <span class="arnia-card__nome">{{ arnia.nome }}</span>
      <span class="arnia-card__id">{{ arnia.id }}</span>
    </div>

    <div class="arnia-card__peso">
      <span class="arnia-card__peso-valore">{{ formattaPeso(ultima?.peso_kg) }} kg</span>
      <span
        class="arnia-card__variazione"
        :class="{
          'arnia-card__variazione--su': direzione === 'su',
          'arnia-card__variazione--giu': direzione === 'giu',
          'arnia-card__variazione--stabile': direzione === 'stabile'
        }"
      >
        <span aria-hidden="true">{{ direzione === 'su' ? '▲' : direzione === 'giu' ? '▼' : '→' }}</span>
        {{ formattaVariazione(variazioneKg) }}
      </span>
    </div>

    <div class="arnia-card__meta">
      <span>Ultime 24h</span>
      <span
        class="arnia-card__batteria"
        :class="{ 'arnia-card__batteria--bassa': batteriaBassa }"
      >
        🔋 {{ ultima ? `${ultima.batteria_v.toFixed(2)} V` : '—' }}
      </span>
    </div>

    <p v-if="haAllerta" class="arnia-card__allerta-testo">
      🐝 Possibile sciamatura<template v-if="caloSciamatura !== null">
        ({{ caloSciamatura.toFixed(1) }} kg</template>) — calo di peso drastico
    </p>
  </NuxtLink>
</template>
