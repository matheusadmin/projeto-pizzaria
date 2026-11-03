'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import { brl4, fmtQtd, parseNum, type Insumo } from '@/lib/admin'
import { INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, Campo, Modal } from '../ui'

interface Props {
  insumo: Insumo
  onClose: () => void
  onSaved: () => void
}

export default function MovimentarEstoqueModal({ insumo, onClose, onSaved }: Props) {
  const [modo, setModo] = useState<'entrada' | 'contagem'>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [custo, setCusto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const qtd = parseNum(quantidade)
  const ficara = qtd == null ? null : modo === 'entrada' ? insumo.quantidade_atual + qtd : qtd

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (qtd == null || qtd < 0 || (modo === 'entrada' && qtd === 0)) return setErro('Informe uma quantidade válida.')

    setSalvando(true)
    setErro(null)
    // Função atômica no banco: trava a linha, não briga com a baixa automática dos pedidos.
    const { error } = await supabase.rpc('movimentar_estoque', {
      p_insumo_id: insumo.id,
      p_modo: modo,
      p_quantidade: qtd,
      p_custo_unitario: modo === 'entrada' ? parseNum(custo) : null,
    })
    if (error) {
      setErro(msgErro(error))
      return setSalvando(false)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={`Movimentar: ${insumo.nome}`} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-sm text-slate-600">
          Estoque atual: <strong className="tabular-nums">{fmtQtd(insumo.quantidade_atual)} {insumo.unidade_medida}</strong>
        </p>

        <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1" role="group" aria-label="Tipo de movimentação">
          {([['entrada', 'Entrada de compra'], ['contagem', 'Contagem (inventário)']] as const).map(([v, r]) => (
            <button key={v} type="button" aria-pressed={modo === v} onClick={() => setModo(v)}
              className={'rounded py-2 text-sm font-semibold ' + (modo === v ? 'bg-[#14181F] text-white' : 'text-slate-700 hover:bg-white')}>
              {r}
            </button>
          ))}
        </div>

        <Campo label={modo === 'entrada' ? `Quantidade comprada (${insumo.unidade_medida})` : `Quantidade contada (${insumo.unidade_medida})`}>
          <input className={INPUT} inputMode="decimal" value={quantidade} autoFocus
            onChange={(e) => setQuantidade(e.target.value)} />
        </Campo>

        {modo === 'entrada' && (
          <Campo label={`Novo custo por ${insumo.unidade_medida} (opcional)`}
            hint={`Custo atual: ${brl4(insumo.custo_unitario)}. Deixe em branco para manter.`}>
            <input className={INPUT} inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
          </Campo>
        )}

        {ficara != null && (
          <p className="text-sm">
            Estoque ficará em <strong className="tabular-nums">{fmtQtd(ficara)} {insumo.unidade_medida}</strong>
          </p>
        )}
        {erro && <p role="alert" className="text-sm font-medium text-[#B42318]">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={BTN_GHOST} onClick={onClose}>Cancelar</button>
          <button type="submit" className={BTN_DARK} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
