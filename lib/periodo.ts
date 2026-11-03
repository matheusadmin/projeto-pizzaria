export type Preset = 'hoje' | '7d' | 'mes' | 'mes_anterior' | 'custom'

/** Date -> 'YYYY-MM-DD' no fuso local (valor de <input type="date">). */
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function intervaloPreset(p: Exclude<Preset, 'custom'>): { de: string; ate: string } {
  const hoje = new Date()
  if (p === 'hoje') return { de: iso(hoje), ate: iso(hoje) }
  if (p === '7d') {
    const ini = new Date(hoje)
    ini.setDate(ini.getDate() - 6)
    return { de: iso(ini), ate: iso(hoje) }
  }
  if (p === 'mes') return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate: iso(hoje) }
  // mes_anterior
  return {
    de: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    ate: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  }
}

/** Datas locais inclusivas -> timestamps [inicio, fim) em ISO/UTC para o banco. */
export function paraTimestamps(de: string, ate: string) {
  const ini = new Date(`${de}T00:00:00`)
  const fim = new Date(`${ate}T00:00:00`)
  fim.setDate(fim.getDate() + 1)
  return { inicio: ini.toISOString(), fim: fim.toISOString() }
}
