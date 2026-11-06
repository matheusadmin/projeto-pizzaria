import { ReactNode } from 'react'
import { RequireRole } from '@/components/RequireRole'
import AdminShell from '@/components/admin/AdminShell'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['admin', 'dev']}>
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  )
}