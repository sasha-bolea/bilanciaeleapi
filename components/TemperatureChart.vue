<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { Misura } from '~/types/database'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const props = defineProps<{
  misure: Misura[]
  periodoGiorni: number
}>()

const formattaEtichetta = (iso: string) => {
  const d = new Date(iso)
  if (props.periodoGiorni <= 7) {
    return d.toLocaleString('it-IT', { weekday: 'short', hour: '2-digit' })
  }
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.misure.map((m) => formattaEtichetta(m.created_at)),
  datasets: [
    {
      label: 'Temperatura (°C)',
      data: props.misure.map((m) => m.temperatura_c),
      borderColor: '#3a7ca5',
      backgroundColor: 'rgba(58, 124, 165, 0.12)',
      fill: true,
      tension: 0.25,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4
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
      ticks: { callback: (v) => `${v}°C` },
      grid: { color: '#e8e0d0' }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.formattedValue} °C`
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
