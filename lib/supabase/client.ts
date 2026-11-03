import { createBrowserClient } from '@supabase/ssr'

// Cliente único para o navegador. A sessão (JWT) vai junto em todas as chamadas,
// por isso o RLS da Etapa 1 enxerga o usuário logado.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
