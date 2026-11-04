import React from 'react';
import Link from 'next/link';

export default function NavBarAdmin() {
  return (
    <nav className="bg-[#14181F] text-white px-6 py-3 flex flex-wrap items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-orange-500">🍕 Casa Gestão</span>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/admin" className="hover:text-orange-400 transition-colors">Painel Admin</Link>
          <Link href="/pedidos" className="hover:text-orange-400 transition-colors bg-orange-600/20 px-2.5 py-1 rounded text-orange-300 border border-orange-500/30">📊 Acompanhamento Pedidos</Link>
          <Link href="/pdv" className="hover:text-orange-400 transition-colors">Caixa (PDV)</Link>
          <Link href="/garcom" className="hover:text-orange-400 transition-colors">Garçom</Link>
          <Link href="/kds" className="hover:text-orange-400 transition-colors">Cozinha (KDS)</Link>
          <Link href="/entregador" className="hover:text-orange-400 transition-colors">Entregador</Link>
        </div>
      </div>
    </nav>
  );
}
