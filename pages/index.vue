<script setup lang="ts">
import type { Arnia, Misura } from '~/types/database'

const supabase = useSupabase()

interface ArniaConMisure {
  arnia: Arnia
  misureRecenti: Misura[]
}

const { data, pending, error, refresh } = await useAsyncData<ArniaConMisure[]>(
  'home-arnie',
  async () => {
    const { data: arnie, error: arnieError } = await supabase
      .from('arnie')
      .select('*')
      .order('id')

    if (arnieError) throw arnieError
    if (!arnie) return []

    const dal = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

    const risultati = await Promise.all(
      arnie.map(async (arnia) => {
        const { data: misure, error: misureError } = await supabase
          .from('misure')
          .select('*')
          .eq('arnia_id', arnia.id)
          .gte('created_at', dal)
          .order('created_at', { ascending: true })

        if (misureError) throw misureError

        return { arnia, misureRecenti: misure ?? [] }
      })
    )

    return risultati
  }
)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Le mie arnie</h1>
      <p>Peso, variazione nelle ultime 24h e stato batteria</p>
    </div>

    <div v-if="pending" class="stato">Caricamento…</div>

    <div v-else-if="error" class="stato stato--errore">
      Errore nel caricamento dei dati.
      <button class="selettore-periodo__bottone" style="margin-top: 8px" @click="refresh()">
        Riprova
      </button>
    </div>

    <div v-else-if="!data || data.length === 0" class="stato">
      Nessuna arnia trovata. Esegui lo script di seed per popolare il database.
    </div>

    <div v-else class="arnie-lista">
      <ArniaCard
        v-for="{ arnia, misureRecenti } in data"
        :key="arnia.id"
        :arnia="arnia"
        :misure-recenti="misureRecenti"
      />
    </div>
  </div>
</template>
