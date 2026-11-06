'use client'

import { useEffect, useMemo, useState } from 'react'
import { brl } from '@/lib/types'
import { fmtQtd, parseNum, numParaInput } from '@/lib/admin'
import { buscarInsumos, montarLista, textoLista } from '@/lib/compras'
import { msgErro } from '@/lib/pedidos'
import type { Insumo } from '@/lib/admin'
import { DISPLAY, INPUT } from '@/lib/ui'
import { linkWhatsApp } from '@/lib/whatsapp'
import { BTN_DARK, BTN_GHOST, Campo, PageHeader, Tag } from '../ui'

export default function ComprasScreen() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [coberturaTxt, setCoberturaTxt] = useState(numParaInput(2))
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    buscarInsumos().then(setInsumos).catch((e) => setErro(msgErro(e))).finally(() => setLoading(false))
  }, [])

  const cobertura = Math.max(1, parseNum(coberturaTxt) ?? 2)
  const itens = useMemo(() => montarLista(insumos, cobertura), [insumos, cobertura])
  const total = itens.reduce((a, i) => a + i.custoEstimado, 0)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoLista(itens))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Use o botão de WhatsApp ou imprima.')
    }
  }

  return (
    <>
      <PageHeader
        titulo="Lista de Compras"
        descricao="Insumos no estoque mínimo ou abaixo dele, com a quantidade sugerida para repor."
        acao={itens.length > 0 && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className={BTN_GHOST} onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar lista'}</button>
            <a className={BTN_GHOST} href={linkWhatsApp('', textoLista(itens))} target="_blank" rel="noopener noreferrer">
              Enviar por WhatsApp
            </a>
            <button type="button" className={BTN_DARK} onClick={() => window.print()}>Imprimir</button>
          </div>
        )}
      />

      {erro && <p role="alert" className="mb-4 bg-superficie-alta p-4 font-medium text-red-400">{erro}</p>}

      <div className="mb-4 max-w-xs print:hidden">
        <Campo label="Nível-alvo (múltiplo do estoque mínimo)" hint="2 = comprar até ter o dobro do mínimo.">
          <input className={INPUT} inputMode="decimal" value={coberturaTxt} onChange={(e) => setCoberturaTxt(e.target.value)} />
        </Campo>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="bg-superficie-alta p-8 text-center text-slate-300">
          Nenhum insumo no mínimo ou abaixo. Defina o estoque mínimo de cada insumo em Estoque para ativar os alertas.
        </p>
      ) : (
        <section className="bg-superficie-alta p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Insumo</th>
                  <th className="py-2 pr-3 text-right">Atual</th>
                  <th className="py-2 pr-3 text-right">Mínimo</th>
                  <th className="py-2 pr-3 text-right">Comprar</th>
                  <th className="py-2 text-right">Custo estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {itens.map((i) => (
                  <tr key={i.insumo.id}>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-white">{i.insumo.nome}</span>{' '}
                      <Tag tone={i.nivel === 'abaixo' ? 'red' : 'amber'}>{i.nivel === 'abaixo' ? 'Abaixo' : 'No mínimo'}</Tag>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtQtd(i.insumo.quantidade_atual)} {i.insumo.unidade_medida}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtQtd(i.insumo.estoque_minimo)} {i.insumo.unidade_medida}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmtQtd(i.sugerido)} {i.insumo.unidade_medida}</td>
                    <td className="py-2 text-right tabular-nums">{brl(i.custoEstimado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`${DISPLAY} mt-4 text-right text-2xl font-bold`}>Total estimado: {brl(total)}</p>
        </section>
      )}
    </>
  )
}
