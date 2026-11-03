'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import { numParaInput, parseNum, UNIDADES, type Insumo, type UnidadeMedida } from '@/lib/admin'
import { INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, Campo, Modal } from '../ui'

interface Props {
  insumo: Insumo | null // null = novo insumo
  onClose: () => void
  onSaved: () => void
}

export default function InsumoFormModal({ insumo, onClose, onSaved }: Props) {
  const [nome, setNome] = useState(insumo?.nome ?? '')
  const [unidade, setUnidade] = useState<UnidadeMedida>(insumo?.unidade_medida ?? 'kg')
  const [qtdInicial, setQtdInicial] = useState('')
  const [minimo, setMinimo] = useState(insumo ? numParaInput(insumo.estoque_minimo) : '')
  const [custo, setCusto] = useState(insumo ? numParaInput(insumo.custo_unitario) : '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const est = parseNum(minimo) ?? 0
    const cst = parseNum(custo) ?? 0
    const qtd = parseNum(qtdInicial) ?? 0
    if (!nome.trim()) return setErro('Informe o nome do insumo.')
    if (est < 0 || cst < 0 || qtd < 0) return setErro('Os valores não podem ser negativos.')

    setSalvando(true)
    setErro(null)
    const dados = { nome: nome.trim(), estoque_minimo: est, custo_unitario: cst }
    const { error } = insumo
      ? await supabase.from('insumos').update(dados).eq('id', insumo.id)
      : await supabase.from('insumos').insert({ ...dados, unidade_medida: unidade, quantidade_atual: qtd })

    if (error) {
      setErro((error as { code?: string }).code === '23505' ? 'Já existe um insumo com esse nome.' : msgErro(error))
      return setSalvando(false)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={insumo ? 'Editar insumo' : 'Novo insumo'} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo label="Nome">
          <input className={INPUT} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>

        <Campo label="Unidade de medida"
          hint={insumo ? 'Para trocar a unidade, crie um novo insumo (as fichas técnicas dependem dela).' : undefined}>
          <select className={INPUT} value={unidade} disabled={!!insumo}
            onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}>
            {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Campo>

        {!insumo && (
          <Campo label="Quantidade em estoque agora">
            <input className={INPUT} inputMode="decimal" value={qtdInicial} onChange={(e) => setQtdInicial(e.target.value)} />
          </Campo>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Estoque mínimo">
            <input className={INPUT} inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </Campo>
          <Campo label={`Custo por ${unidade} (R$)`}>
            <input className={INPUT} inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
          </Campo>
        </div>

        {insumo && (
          <p className="text-xs text-slate-500">
            Para alterar a quantidade em estoque, use “Movimentar” na lista. Assim a mudança fica registrada.
          </p>
        )}
        {erro && <p role="alert" className="text-sm font-medium text-[#B42318]">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={BTN_GHOST} onClick={onClose}>Cancelar</button>
          <button type="submit" className={BTN_DARK} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar insumo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
