'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function NavBarAdmin() {
  const pathname = usePathname();
  const router = useRouter();

  // Oculta a barra de navegação se estiver na página de login
  if (pathname === '/login') return null;

  const handleLogout = () => {
    router.push('/login');
  };

  const linkStyle = (path) => {
    const isAtivo = path === '/admin' ? pathname === '/admin' : pathname?.startsWith(path);
    return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isAtivo ? 'bg-orange-600 text-white font-bold' : 'hover:bg-gray-800 text-gray-300'
    }`;
  };

  return (
    <nav className="bg-gray-900 text-white border-b border-gray-800 px-4 py-3 flex flex-wrap justify-between items-center shadow-md gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin" className="font-bold text-xl text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-2">
          🍕 <span>Kika Pizzaria</span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-2 border-l border-gray-700 pl-4">
          <Link href="/pdv" className={linkStyle('/pdv')}>
            🛒 Caixa / PDV
          </Link>

          <Link href="/garcom" className={linkStyle('/garcom')}>
            🪑 Garçom
          </Link>

          <Link href="/kds" className={linkStyle('/kds')}>
            🍳 KDS Cozinha
          </Link>

          <Link href="/entregador" className={linkStyle('/entregador')}>
            🛵 Entregador
          </Link>

          <span className="text-gray-600">|</span>

          <Link href="/admin/financeiro" className={linkStyle('/admin/financeiro')}>
            📊 Financeiro (DRE)
          </Link>

          <Link href="/admin/insumos" className={linkStyle('/admin/insumos')}>
            📦 Insumos
          </Link>

          <Link href="/admin/fichas" className={linkStyle('/admin/fichas')}>
            📋 Fichas Técnicas
          </Link>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
      >
        Sair 🚪
      </button>
    </nav>
  );
}
