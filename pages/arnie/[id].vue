<script setup lang="ts">
import type { Arnia, Misura } from '~/types/database'
import { rilevaVariazioniSospette } from '~/composables/useArniaAlerts'

const route = useRoute()
const arniaId = computed(() => route.params.id as string)
const supabase = useSupabase()

const PERIODI = [7, 30, 90] as const
const periodoGiorni = ref<(typeof PERIODI)[number]>(30)

const { data: arnia, pending: arniaPending, error: arniaError } = await useAsyncData<Arnia | null>(
  () => `arnia-${arniaId.value}`,
  async () => {
    const { data, error } = await supabase.from('arnie').select('*').eq('id', arniaId.value).single()
    if (error) throw error
    return data
  }
)

const {
  data: misure,
  pending: misurePending,
  error: misureError
} = await useAsyncData<Misura[]>(
  () => `misure-${arniaId.value}-${periodoGiorni.value}`,
  async () => {
    const dal = new Date(Date.now() - periodoGiorni.value * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('misure')
      .select('*')
      .eq('arnia_id', arniaId.value)
      .gte('created_at', dal)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },
  { watch: [periodoGiorni] }
)

const haSensoreTemperatura = computed(() => (misure.value ?? []).some((m) => m.temperatura_c !== null))

const variazioniSospette = computed(() =>
  rilevaVariazioniSospette(misure.value ?? []).filter((m) => m.variazioneSospetta)
)

const formattaData = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

const pending = computed(() => arniaPending.value || misurePending.value)
const error = computed(() => arniaError.value || misureError.value)
</script>

<template>
  <div>
    <NuxtLink to="/" class="back-link">← Tutte le arnie</NuxtLink>

    <div v-if="pending" class="stato">Caricamento…</div>
    <div v-else-if="error" class="stato stato--errore">Errore nel caricamento dei dati.</div>
    <div v-else-if="!arnia" class="stato">Arnia non trovata.</div>

    <template v-else>
      <div class="page-header">
        <h1>{{ arnia.nome }}</h1>
        <p>{{ arnia.id }}</p>
      </div>
      <p v-if="arnia.note" class="arnia-note">{{ arnia.note }}</p>

      <div class="selettore-periodo">
        <button
          v-for="p in PERIODI"
          :key="p"
          type="button"
          class="selettore-periodo__bottone"
          :class="{ 'selettore-periodo__bottone--attivo': periodoGiorni === p }"
          @click="periodoGiorni = p"
        >
          {{ p }} gg
        </button>
      </div>

      <div v-if="variazioniSospette.length > 0" class="allerta-banner">
        <span class="allerta-banner__icona">⚠️</span>
        <div>
          <strong>Variazioni di peso sospette nel periodo selezionato</strong>
          <p style="margin: 4px 0 0">
            Possibile sciamatura o furto: calo/aumento di oltre 1 kg in poche ore.
          </p>
          <ul>
            <li v-for="m in variazioniSospette" :key="m.id">
              {{ formattaData(m.created_at) }} — {{ m.peso_kg.toFixed(2) }} kg
            </li>
          </ul>
        </div>
      </div>

      <div class="grafico-riquadro">
        <h2>Peso ({{ periodoGiorni }} giorni)</h2>
        <WeightChart :misure="misure ?? []" :periodo-giorni="periodoGiorni" />
      </div>

      <div v-if="haSensoreTemperatura" class="grafico-riquadro">
        <h2>Temperatura ({{ periodoGiorni }} giorni)</h2>
        <TemperatureChart :misure="misure ?? []" :periodo-giorni="periodoGiorni" />
      </div>
    </template>
  </div>
</template>
