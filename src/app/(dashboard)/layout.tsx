import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { DEMO_ROLE_COOKIE } from '@/lib/demo-session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demoRole = cookies().get(DEMO_ROLE_COOKIE)?.value

  if (!user && demoRole !== 'admin') redirect('/login')

  return (
    <div className="premium-screen min-h-screen">
      <Sidebar />
      <main className="min-h-screen pb-8 lg:pl-64 flex flex-col">
        {children}
      </main>
    </div>
  )
}
