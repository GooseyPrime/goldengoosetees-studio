import Image from 'next/image'
import Link from 'next/link'
import { getLandingCatalogPreview } from '@/lib/landing/catalogPreview'

const LOGO_URL =
  'https://res.cloudinary.com/dksj2niho/image/upload/v1770648639/GoldenGooseTeesNOBG_Custom_dlr3dr.png'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const products = await getLandingCatalogPreview(6)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image
              src={LOGO_URL}
              alt="Golden Goose Tees"
              width={160}
              height={48}
              className="h-9 w-auto object-contain"
              priority
            />
            <div className="hidden sm:block min-w-0">
              <p className="font-serif text-lg font-semibold text-zinc-100 leading-tight">Golden Goose Tees</p>
              <p className="text-xs text-zinc-500">Wear your truth. Loudly.</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/login" className="text-zinc-400 hover:text-zinc-200">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 font-medium text-zinc-100 hover:bg-zinc-800"
            >
              Sign up
            </Link>
            <Link
              href="/studio"
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Open design studio
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-500/90 mb-4">Custom apparel</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-zinc-50 max-w-3xl mx-auto leading-tight">
            AI-guided designs on premium blanks — printed and shipped to your door.
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
            Describe your idea, refine it with an assistant, generate print-ready artwork, preview mockups, and checkout
            securely. Built for real garments and Printful fulfillment.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/studio"
              className="rounded-xl bg-amber-500 px-8 py-3.5 text-base font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Start designing
            </Link>
            <Link
              href="/account"
              className="rounded-xl border border-zinc-600 px-8 py-3.5 text-base font-medium text-zinc-100 hover:bg-zinc-900"
            >
              Your account
            </Link>
          </div>
        </section>

        <section className="border-t border-zinc-800 bg-zinc-900/30 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-zinc-50 text-center mb-4">
              How it works
            </h2>
            <p className="text-center text-zinc-500 max-w-xl mx-auto mb-12">
              Same flow you use in the studio — without opening the builder until you are ready.
            </p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '1',
                  title: 'Pick a product',
                  body: 'Curated tees, hoodies, and more with accurate print areas and sizing.',
                },
                {
                  step: '2',
                  title: 'Add your art',
                  body: 'Upload files or generate graphics tuned for DTG — front, back, and sleeves where supported.',
                },
                {
                  step: '3',
                  title: 'Mockups',
                  body: 'See your design on the garment before you pay.',
                },
                {
                  step: '4',
                  title: 'Checkout',
                  body: 'Stripe handles payment; Printful produces and ships your order.',
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-left"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-zinc-100">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-zinc-50 text-center mb-4">
            Representative products
          </h2>
          <p className="text-center text-zinc-500 max-w-xl mx-auto mb-12">
            A sample of what you can configure in the studio — colors, sizes, and placements vary by item.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-zinc-900 relative flex items-center justify-center">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  ) : (
                    <span className="text-4xl font-serif text-zinc-700" aria-hidden>
                      {p.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs uppercase tracking-wide text-amber-500/80 mb-1">{p.typeLabel}</p>
                  <h3 className="font-serif text-lg font-semibold text-zinc-100 leading-snug">{p.name}</h3>
                  <p className="mt-2 text-sm text-zinc-500 line-clamp-3 flex-1">{p.description}</p>
                  <p className="mt-4 text-sm font-medium text-zinc-300">{p.priceLabel}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="text-center mt-10">
            <Link href="/studio" className="text-amber-400 hover:text-amber-300 font-medium">
              Browse full catalog in the studio →
            </Link>
          </p>
        </section>

        <section className="border-t border-zinc-800 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-2xl font-semibold text-zinc-50">Ready when you are</h2>
            <p className="mt-3 text-zinc-500">
              Sign in to save sessions, or jump straight into the studio as a guest and create an account later.
            </p>
            <Link
              href="/studio"
              className="inline-flex mt-8 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Open design studio
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-8 px-4 text-center text-sm text-zinc-600">
        <p>Golden Goose Tees — custom apparel with AI-assisted design.</p>
      </footer>
    </div>
  )
}
