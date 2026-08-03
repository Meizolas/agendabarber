import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#030405] text-white">
      <main className="dashboard-frame mx-auto flex min-h-screen w-full max-w-[430px] flex-col border-x border-white/[0.06] bg-[#080A0C] pb-24 shadow-[0_0_80px_rgba(0,0,0,0.7)]">
        {children}
      </main>
      <Sidebar />
    </div>
  )
}
