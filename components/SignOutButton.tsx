'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await supabase.auth.signOut()
        router.replace('/login')
      }}
    >
      Sair
    </button>
  )
}
