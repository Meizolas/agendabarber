export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#030405] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-3 py-4 sm:px-4">
        {children}
      </div>
    </main>
  )
}
