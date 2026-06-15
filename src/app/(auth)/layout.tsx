export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070809] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4">
        {children}
      </div>
    </main>
  )
}
