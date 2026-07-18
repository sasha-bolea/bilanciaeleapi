<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { rilevaVariazioniSospette } from '~/composables/useArniaAlerts'
import type { Misura } from '~/types/database'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps<{
  misure: Misura[]
  periodoGiorni: number
}>()

const misureConAlert = computed(() => rilevaVariazioniSospette(props.misure))

const formattaEtichetta = (iso: string) => {
  const d = new Date(iso)
  if (props.periodoGiorni <= 7) {
    return d.toLocaleString('it-IT', { weekday: 'short', hour: '2-digit' })
  }
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const chartData = computed<ChartData<'line'>>(() => ({
  labels: misureConAlert.value.map((m) => formattaEtichetta(m.created_at)),
  datasets: [
    {
      label: 'Peso (kg)',
      data: misureConAlert.value.map((m) => m.peso_kg),
      borderColor: '#c9840d',
      backgroundColor: 'rgba(242, 167, 27, 0.15)',
      fill: true,
      tension: 0.25,
      borderWidth: 2,
      pointRadius: misureConAlert.value.map((m) => (m.variazioneSospetta ? 5 : 0)),
      pointHoverRadius: 5,
      pointBackgroundColor: misureConAlert.value.map((m) =>
        m.variazioneSospetta ? '#d94f4f' : '#c9840d'
      )
    }
  ]
}))

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: {
      ticks: { maxTicksLimit: 6, autoSkip: true },
      grid: { display: false }
    },
    y: {
      ticks: { callback: (v) => `${v} kg` },
      grid: { color: '#e8e0d0' }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.formattedValue} kg`
      }
    }
  }
}


</script>

<template>
  <div class="grafico-contenitore">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
