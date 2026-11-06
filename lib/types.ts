// Tipos espelhando o schema criado nas Etapas 1 e 2.

export type Role = 'admin' | 'dev' | 'caixa' | 'cozinha' | 'entregador'
export type TipoPedido = 'delivery' | 'mesa' | 'balcao' | 'retirada'
export type StatusPedido =
  | 'pendente' | 'em_preparo' | 'pronto' | 'saiu_para_entrega' | 'entregue' | 'cancelado'
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'outro'

export interface Perfil { id: string; nome: string; role: Role }

// ---------- Cardápio ----------
export interface Categoria { id: string; nome: string }

export interface Tamanho {
  id: string
  produto_id: string
  nome_tamanho: string
  preco_venda: number
}

export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao: string | null
  disponivel: boolean
  produto_tamanhos: Tamanho[]
}

// ---------- PDV ----------
export interface CartItem {
  key: string                 // chave local da linha do carrinho
  produto_id: string
  tamanho_id: string
  nome_produto: string
  nome_tamanho: string
  preco_unitario: number
  quantidade: number
  observacoes: string
}

export interface PedidoMeta {
  tipo: TipoPedido
  mesa: string
  clienteNome: string
  clienteTelefone: string
  endereco: string
  cidade: string
  bairro: string       // nome do bairro, ou OUTRO (lib/taxasEntrega) quando fora da tabela
  taxaEntrega: number
  formaPagamento: FormaPagamento | ''
  pago: boolean
  observacoes: string
}

export const META_INICIAL: PedidoMeta = {
  tipo: 'balcao',
  mesa: '',
  clienteNome: '',
  clienteTelefone: '',
  endereco: '',
  cidade: '',
  bairro: '',
  taxaEntrega: 0,
  formaPagamento: '',
  pago: false,
  observacoes: '',
}

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'outro', label: 'Outro' },
]

// ---------- KDS ----------
export interface ItemKds {
  id: string
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  observacoes: string | null
  created_at: string
}

export interface PedidoKds {
  id: string
  numero: number
  tipo: TipoPedido
  status: StatusPedido
  mesa: string | null
  cliente_nome: string | null
  observacoes: string | null
  created_at: string
  itens_pedido: ItemKds[]
}

// ---------- Utilidades ----------
/** Formata em reais. Tolera null/undefined/NaN (ex.: pedido ainda sem total) e mostra R$ 0,00. */
export const brl = (valor: number | null | undefined) => {
  const n = Number(valor)
  return (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const round2 = (n: number) => Math.round(n * 100) / 100
