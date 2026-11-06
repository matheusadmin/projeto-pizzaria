'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import { BTN_DARK, BTN_GHOST, BTN_RED, Campo, Modal, PageHeader, Tag } from '@/components/admin/ui'
import { parseNum } from '@/lib/admin'
import {
  abrirCaixa, buscarSessaoAberta, calcularEsperado, fecharCaixa, FORMAS_CAIXA, listarMovimentos,
  listarSessoesFechadas, registrarMovimento, somaTotais, totaisVazios, vendasDaSessao,
  type MovimentoCaixa, type SessaoCaixa, type TotaisForma,
} from '@/lib/caixa'
import { msgErro } from '@/lib/pedidos'
import { brl } from '@/lib/types'
import { DISPLAY, INPUT } from '@/lib/ui'

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function Cartao({ titulo, valor, sub, destaque }: { titulo: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`bg-superficie-alta p-4 ${destaque ? 'border-t-4 border-marca' : 'border-t-4 border-transparent'}`}>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`${DISPLAY} text-4xl font-bold leading-tight tabular-nums text-white`}>{valor}</p>
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
    </div>
  )
}

export default function CaixaScreen() {
  const perfil = usePerfil()
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null)
  const [vendas, setVendas] = useState<TotaisForma>(totaisVazios())
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([])
  const [historico, setHistorico] = useState<SessaoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [fundoTxt, setFundoTxt] = useState('')
  const [modal, setModal] = useState<null | 'sangria' | 'reforco' | 'fechar'>(null)

  const carregar = useCallback(async () => {
    try {
      const aberta = await buscarSessaoAberta()
      setSessao(aberta)
      if (aberta) {
        const [v, m] = await Promise.all([vendasDaSessao(aberta.id), listarMovimentos(aberta.id)])
        setVendas(v)
        setMovimentos(m)
      } else {
        setVendas(totaisVazios())
        setMovimentos([])
      }
      setHistorico(await listarSessoesFechadas())
      setErro(null)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Atualiza sozinho: as vendas entram no caixa enquanto a tela está aberta.
  useEffect(() => {
    if (!sessao) return
    const t = setInterval(carregar, 20_000)
    return () => clearInterval(t)
  }, [sessao, carregar])

  const esperado = useMemo(
    () => (sessao ? calcularEsperado(sessao, vendas, movimentos) : totaisVazios()),
    [sessao, vendas, movimentos],
  )
  const sangrias = movimentos.filter((m) => m.tipo === 'sangria').reduce((a, m) => a + Number(m.valor), 0)
  const reforcos = movimentos.filter((m) => m.tipo === 'reforco').reduce((a, m) => a + Number(m.valor), 0)

  async function abrir() {
    const fundo = parseNum(fundoTxt) ?? 0
    if (fundo < 0) return setErro('O fundo de troco não pode ser negativo.')
    try {
      await abrirCaixa(fundo, perfil)
      setFundoTxt('')
      await carregar()
    } catch (e) {
      setErro(msgErro(e))
    }
  }

  if (loading) return <p className="p-6 text-slate-400">Carregando…</p>

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <PageHeader
        titulo="Controle de Caixa"
        descricao="Abertura com fundo de troco, sangrias, reforços e fechamento com conferência por forma de pagamento."
        acao={sessao ? <Tag tone="green">Caixa aberto</Tag> : <Tag tone="slate">Caixa fechado</Tag>}
      />

      {erro && <p role="alert" className="bg-superficie-alta p-4 font-medium text-red-400">{erro}</p>}

      {!sessao ? (
        <section className="max-w-md space-y-4 bg-superficie-alta p-6">
          <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Abrir caixa</h2>
          <Campo label="Fundo de troco inicial (R$)" hint="Dinheiro que já está na gaveta ao abrir o turno.">
            <input className={INPUT} inputMode="decimal" value={fundoTxt} placeholder="0,00"
              onChange={(e) => setFundoTxt(e.target.value)} />
          </Campo>
          <button type="button" className={BTN_DARK} onClick={abrir}>Abrir caixa</button>
          <p className="text-xs text-slate-400">
            Enquanto não houver caixa aberto, os pagamentos continuam sendo gravados nos pedidos, mas não entram
            na conferência de nenhum turno.
          </p>
        </section>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            Aberto por <strong className="text-white">{sessao.aberto_por_nome ?? '—'}</strong> em {quando(sessao.aberto_em)}
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao titulo="Fundo de troco" valor={brl(Number(sessao.fundo_inicial))} />
            <Cartao titulo="Vendas recebidas" valor={brl(somaTotais(vendas))} sub="todas as formas" destaque />
            <Cartao titulo="Reforços" valor={brl(reforcos)} />
            <Cartao titulo="Sangrias" valor={brl(sangrias)} />
          </div>

          <section className="bg-superficie-alta p-5">
            <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Esperado por forma de pagamento</h2>
            <dl className="mt-3 grid max-w-md grid-cols-2 gap-y-1.5 text-sm">
              {FORMAS_CAIXA.map((f) => (
                <div key={f.value} className="contents">
                  <dt className="text-slate-400">
                    {f.label}{f.value === 'dinheiro' ? ' (na gaveta)' : ''}
                  </dt>
                  <dd className="text-right font-semibold tabular-nums">{brl(esperado[f.value])}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => setModal('reforco')}>＋ Reforço</button>
              <button type="button" className={BTN_GHOST} onClick={() => setModal('sangria')}>－ Sangria</button>
              <button type="button" className={BTN_DARK} onClick={() => setModal('fechar')}>Fechar caixa</button>
            </div>
          </section>

          {movimentos.length > 0 && (
            <section className="bg-superficie-alta p-5">
              <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Movimentações do turno</h2>
              <ul className="mt-3 divide-y divide-white/10 text-sm">
                {movimentos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <Tag tone={m.tipo === 'sangria' ? 'red' : 'green'}>{m.tipo === 'sangria' ? 'Sangria' : 'Reforço'}</Tag>{' '}
                      <span className="text-slate-300">{m.motivo || 'Sem motivo informado'}</span>
                      <span className="text-slate-500"> · {quando(m.created_at)} · {m.criado_por_nome ?? '—'}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {m.tipo === 'sangria' ? '−' : '+'}{brl(Number(m.valor))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {historico.length > 0 && (
        <section className="bg-superficie-alta p-5">
          <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Últimos fechamentos</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Turno</th>
                  <th className="py-2 pr-3">Operador</th>
                  <th className="py-2 pr-3 text-right">Esperado</th>
                  <th className="py-2 pr-3 text-right">Contado</th>
                  <th className="py-2 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {historico.map((s) => {
                  const dif = Number(s.diferenca ?? 0)
                  return (
                    <tr key={s.id}>
                      <td className="py-2 pr-3">{quando(s.aberto_em)} → {s.fechado_em ? quando(s.fechado_em) : '—'}</td>
                      <td className="py-2 pr-3">{s.fechado_por_nome ?? s.aberto_por_nome ?? '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{s.esperado ? brl(somaTotais(s.esperado)) : '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{s.contado ? brl(somaTotais(s.contado)) : '—'}</td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${dif === 0 ? 'text-sucesso-claro' : dif < 0 ? 'text-red-400' : 'text-marca'}`}>
                        {dif > 0 ? '+' : ''}{brl(dif)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sessao && (modal === 'sangria' || modal === 'reforco') && (
        <MovimentoModal
          tipo={modal}
          onClose={() => setModal(null)}
          onSalvar={async (valor, motivo) => {
            await registrarMovimento(sessao.id, modal, valor, motivo, perfil)
            setModal(null)
            await carregar()
          }}
        />
      )}

      {sessao && modal === 'fechar' && (
        <FechamentoModal
          esperado={esperado}
          onClose={() => setModal(null)}
          onFechar={async (contado, obs) => {
            await fecharCaixa(sessao.id, esperado, contado, obs, perfil)
            setModal(null)
            await carregar()
          }}
        />
      )}
    </div>
  )
}

function MovimentoModal({ tipo, onClose, onSalvar }: {
  tipo: 'sangria' | 'reforco'
  onClose: () => void
  onSalvar: (valor: number, motivo: string) => Promise<void>
}) {
  const [valorTxt, setValorTxt] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const valor = parseNum(valorTxt)
    if (valor == null || valor <= 0) return setErro('Informe um valor maior que zero.')
    setSalvando(true)
    try { await onSalvar(valor, motivo) } catch (e) { setErro(msgErro(e)); setSalvando(false) }
  }

  return (
    <Modal title={tipo === 'sangria' ? 'Sangria (retirada)' : 'Reforço (entrada de troco)'} onClose={onClose}>
      <Campo label="Valor (R$)">
        <input className={INPUT} inputMode="decimal" autoFocus value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
      </Campo>
      <Campo label="Motivo">
        <input className={INPUT} value={motivo} placeholder={tipo === 'sangria' ? 'Ex.: pagamento de fornecedor' : 'Ex.: troco extra'}
          onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={onClose}>Cancelar</button>
        <button type="button" className={BTN_DARK} disabled={salvando} onClick={salvar}>Registrar</button>
      </div>
    </Modal>
  )
}

function FechamentoModal({ esperado, onClose, onFechar }: {
  esperado: TotaisForma
  onClose: () => void
  onFechar: (contado: TotaisForma, obs: string) => Promise<void>
}) {
  const [txt, setTxt] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const contado = totaisVazios()
  for (const f of FORMAS_CAIXA) contado[f.value] = parseNum(txt[f.value] ?? '') ?? 0
  const diferencaTotal = somaTotais(contado) - somaTotais(esperado)

  async function fechar() {
    setSalvando(true)
    try { await onFechar(contado, obs) } catch (e) { setErro(msgErro(e)); setSalvando(false) }
  }

  return (
    <Modal title="Fechar caixa" onClose={onClose}>
      <p className="text-sm text-slate-400">Conte cada forma de pagamento e informe o valor encontrado.</p>
      <div className="space-y-2">
        {FORMAS_CAIXA.map((f) => {
          const dif = contado[f.value] - esperado[f.value]
          return (
            <div key={f.value} className="grid grid-cols-[1fr_7rem_6rem] items-center gap-2 text-sm">
              <span>
                {f.label}
                <span className="block text-xs text-slate-500">esperado {brl(esperado[f.value])}</span>
              </span>
              <input className={INPUT} inputMode="decimal" placeholder="0,00" aria-label={`Contado em ${f.label}`}
                value={txt[f.value] ?? ''} onChange={(e) => setTxt({ ...txt, [f.value]: e.target.value })} />
              <span className={`text-right tabular-nums ${Math.abs(dif) < 0.005 ? 'text-slate-500' : dif < 0 ? 'text-red-400' : 'text-marca'}`}>
                {Math.abs(dif) < 0.005 ? '—' : `${dif > 0 ? '+' : ''}${brl(dif)}`}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between border-t border-white/10 pt-3 font-semibold">
        <span>Diferença total</span>
        <span className={`tabular-nums ${Math.abs(diferencaTotal) < 0.005 ? 'text-sucesso-claro' : diferencaTotal < 0 ? 'text-red-400' : 'text-marca'}`}>
          {diferencaTotal > 0 ? '+' : ''}{brl(diferencaTotal)}
        </span>
      </div>
      <Campo label="Observações">
        <input className={INPUT} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sobra de R$ 2 por troco errado" />
      </Campo>
      {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={onClose}>Voltar</button>
        <button type="button" className={BTN_RED} disabled={salvando} onClick={fechar}>Confirmar fechamento</button>
      </div>
    </Modal>
  )
}
