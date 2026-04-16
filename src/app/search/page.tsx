'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'

const TYPE_COLORS: Record<string, string> = {
  HYDRO: '#1a1a1a', VITAL: '#dc2626', DELAYED_VITAL: '#2563eb', UPS: '#ea580c',
}
const TYPE_LABELS: Record<string, string> = {
  HYDRO: 'Hydro', VITAL: 'Vital', DELAYED_VITAL: 'Delayed Vital', UPS: 'UPS',
}

export default function SearchPage() {
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  if (!session) return null

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/panels?q=${encodeURIComponent(query)}`)
    if (res.ok) {
      const data = await res.json()
      setResults(data)
      setSearched(true)
    }
    setLoading(false)
  }

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Panels</h1>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by panel name, location, description, or fed from..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003865] shadow-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#003865] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 shadow-sm"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>

        {searched && (
          <div>
            <p className="text-sm text-gray-500 mb-4">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>

            {results.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No panels found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map(panel => (
                  <Link
                    key={panel.id}
                    href={`/panels/${panel.id}`}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div
                      className="w-1.5 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[panel.panelType] || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 mono">{panel.designation}</div>
                      <div className="text-sm text-gray-500 truncate">{panel.building.name} · {panel.location}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: TYPE_COLORS[panel.panelType] }}
                      >
                        {TYPE_LABELS[panel.panelType]}
                      </span>
                      <span className="text-xs text-gray-400">{panel.circuitCount} ccts</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">Search the panel directory</p>
            <p className="text-sm mt-1">Search by designation, location, building, or fed from</p>
          </div>
        )}
      </main>
    </div>
  )
}
