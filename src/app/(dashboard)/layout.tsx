import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="premium-screen min-h-screen">
      <Sidebar />
      <main className="min-h-screen pb-8 lg:pl-64 flex flex-col">
        {children}
      </main>
    </div>
  )
}
