// Função para calcular o estado do SLA com base no setor de produção
export function calcularSLA(createdAt, setorTipo) {
  const agora = new Date();
  const criado = new Date(createdAt);
  const minutosDecorridos = Math.floor((agora - criado) / (1000 * 60));

  let amarelo = 15;
  let vermelho = 25;

  switch (setorTipo) {
    case 'pizzaria':
      amarelo = 20;
      vermelho = 30;
      break;
    case 'chapa':
      amarelo = 8;
      vermelho = 12;
      break;
    case 'fritadeira':
      amarelo = 6;
      vermelho = 9;
      break;
    default:
      amarelo = 15;
      vermelho = 25;
  }

  if (minutosDecorridos >= vermelho) {
    return { nivel: 'critico', cor: 'bg-red-600 text-white animate-pulse', tempo: minutosDecorridos };
  } else if (minutosDecorridos >= amarelo) {
    return { nivel: 'atencao', cor: 'bg-yellow-500 text-black', tempo: minutosDecorridos };
  } else {
    return { nivel: 'normal', cor: 'bg-green-600 text-white', tempo: minutosDecorridos };
  }
}