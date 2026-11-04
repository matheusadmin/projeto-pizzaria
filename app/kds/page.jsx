'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Ou importe a sua instância do Supabase de 'lib/supabase'
import { CartaoPedidoKDS } from '@/components/CartaoPedidoKDS';

// Inicialize o Supabase (ou use a sua importação existente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TelaKDS() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar os pedidos do setor ordenados por FIFO (created_at)
  const buscarPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos_cozinha') // Substitua pelo nome exato da sua tabela no Supabase
        .select('*')
        .in('status', ['pendente', 'em_preparo'])
        .order('created_at', { ascending: true }); // Fila estrita por ordem de chegada!

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarPedidos();

    // Opcional: Atualização em tempo real com Supabase Realtime
    const channel = supabase
      .channel('realtime-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_cozinha' }, () => {
        buscarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Função para concluir o pedido
  const handleMarcarComoPronto = async (id) => {
    try {
      const { error } = await supabase
        .from('pedidos_cozinha')
        .update({ status: 'pronto' })
        .eq('id', id);

      if (error) throw error;
      
      // Remove o pedido da tela localmente após atualizar
      setPedidos(pedidos.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
    }
  };

  if (loading) return <div className="p-6 text-white">A carregar KDS...</div>;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">KDS - Cozinha (Fila Única Cronológica)</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pedidos.length === 0 ? (
          <p className="text-gray-400">Nenhum pedido pendente no momento. Bom trabalho! 🎉</p>
        ) : (
          pedidos.map((pedido) => (
            <CartaoPedidoKDS 
              key={pedido.id} 
              pedido={pedido} 
              onMarcarComoPronto={handleMarcarComoPronto} 
            />
          ))
        )}
      </div>
    </div>
  );
}