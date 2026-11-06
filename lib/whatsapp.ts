// Atalhos de WhatsApp (links wa.me). Não exige API: abre a conversa já com a mensagem pronta.

export const soDigitos = (v: string) => v.replace(/\D/g, '')

/** Telefone brasileiro em formato internacional (55 + DDD + número), ou null se não parecer válido. */
export function telefoneWhats(tel: string | null | undefined): string | null {
  if (!tel) return null
  const d = soDigitos(tel)
  if (d.length === 10 || d.length === 11) return `55${d}`
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d
  return null
}

/** Link do WhatsApp. Sem telefone, o WhatsApp deixa escolher o contato. */
export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const num = telefoneWhats(telefone) ?? ''
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
}

/** Mensagem automática por etapa do pedido; null quando a etapa não pede aviso ao cliente. */
export function mensagemPedido(p: {
  status: string; tipo: string; numero: number; cliente_nome: string | null
}): string | null {
  const nome = p.cliente_nome?.trim() ? ` ${p.cliente_nome.trim().split(' ')[0]}` : ''
  const ola = `Olá${nome}! `
  switch (p.status) {
    case 'em_preparo':
      return `${ola}Seu pedido #${p.numero} foi aceito na cozinha da Kikas Pizzaria e já está sendo preparado. 🍕`
    case 'pronto':
      return p.tipo === 'delivery'
        ? `${ola}Seu pedido #${p.numero} está pronto e aguardando o motoboy. 🍕`
        : `${ola}Seu pedido #${p.numero} está pronto para retirada. 🍕`
    case 'saiu_para_entrega':
      return `${ola}Seu pedido #${p.numero} saiu para entrega com o nosso motoboy. 🛵`
    case 'entregue':
      return `${ola}Obrigado pela preferência! Esperamos que goste do pedido #${p.numero}. Volte sempre à Kikas! ❤️`
    default:
      return null
  }
}
