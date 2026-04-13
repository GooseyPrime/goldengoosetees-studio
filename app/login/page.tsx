import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
      <Link href="/studio" className="mb-8 text-amber-400/90 hover:text-amber-300 text-sm">
        ← Back to studio
      </Link>
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 animate-pulse h-80" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
