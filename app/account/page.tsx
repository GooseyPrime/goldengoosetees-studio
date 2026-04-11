import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-sm text-amber-400/90 hover:text-amber-300">
          ← Studio
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-zinc-50">Your account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Signed in as <span className="text-zinc-200">{user.email}</span>
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-400">
            Designs and chat are saved automatically while you work in the studio when you are logged in.
          </p>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
