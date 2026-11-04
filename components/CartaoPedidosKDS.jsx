import React, { useEffect, useState } from 'react';
import { calcularSLA } from '../utils/sla';

export function CartaoPedidoKDS({ pedido, onMarcarComoPronto }) {
  const [sla, setSla] = useState(calcularSLA(pedido.created_at, pedido.setor_tipo));

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSla(calcularSLA(pedido.created_at, pedido.setor_tipo));
    }, 30000);

    return () => clearInterval(intervalo);
  }, [pedido.created_at, pedido.setor_tipo]);

  const badgesCanal = {
    delivery: { icone: '🛵', texto: 'Delivery', cor: 'bg-blue-600' },
    mesa: { icone: '🪑', texto: `Mesa ${pedido.mesa_numero}`, cor: 'bg-purple-600' },
    retirada: { icone: '📦', texto: 'Retirada', cor: 'bg-orange-600' }
  };

  const canalInfo = badgesCanal[pedido.canal] || { icone: '🍽️', texto: 'Balcão', cor: 'bg-gray-600' };

  return (
    <div className={`rounded-xl p-4 shadow-lg border-2 transition-all duration-300 ${sla.cor}`}>
      <div className="flex justify-between items-center mb-3 border-b border-white/20 pb-2">
        <span className="font-bold text-lg">#{pedido.numero_pedido}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold text-white ${canalInfo.cor}`}>
            {canalInfo.icone} {canalInfo.texto}
          </span>
          <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded">
            ⏱️ {sla.tempo} min
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="font-bold text-base">{pedido.item_nome}</p>
        <p className="text-xs opacity-90 mt-1">Obs: {pedido.observacoes || 'Sem observações'}</p>
      </div>

      <button 
        onClick={() => onMarcarComoPronto(pedido.id)}
        className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2 rounded-lg text-sm transition-colors"
      >
        Marcar como Pronto ✓
      </button>
    </div>
  );
}