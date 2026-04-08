'use client'

export default function DesignStudio() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl">🪿</div>
          <div>
            <h1 className="text-xl font-bold">Golden Goose Tees</h1>
            <p className="text-xs text-gray-600">Wear Your Truth. Loudly.</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold">Design Your Custom Apparel</h2>
          <p className="text-xl text-gray-600">
            Chat with AI to create unique designs, then order your custom products
          </p>
          <div className="mt-8 p-8 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto">
            <p className="text-gray-500">
              Clean Next.js 14 App - Ready for AI integration
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
