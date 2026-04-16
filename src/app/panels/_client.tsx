'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PANEL_TYPES } from '@/lib/types'
import { canDirectEdit } from '@/lib/auth'

const TYPE_COLORS: Record<string, string> = {
  HYDRO: '#1a1a1a', VITAL: '#dc2626', DELAYED_VITAL: '#2563eb', UPS: '#ea580c',
}
const TYPE_LABELS: Record<string, string> = {
  HYDRO: 'Hydro', VITAL: 'Vital', DELAYED_VITAL: 'Delayed Vital', UPS: 'UPS',
}

interface Panel {
  id: string
  designation: string
  panelType: string
  location: string | null
  voltage: string | null
  circuitCount: number
  building: { id: string; name: string; abbrev: string }
  _count: { circuits: number; photos: number }
}

interface Building {
  id: string
  name: string
  abbrev: string
}

export default function PanelsClient({
  initialPanels, buildings, userRole,
}: {
  initialPanels: Panel[]
  buildings: Building[]
  userRole: string
}) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')
  const [sortBy, setSortBy] = useState<'designation' | 'type'>('designation')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [allCollapsed, setAllCollapsed] = useState(false)

  const filtered = useMemo(() => {
    let p = initialPanels
    if (search) {
      const q = search.toLowerCase()
      p = p.filter(x =>
        x.designation.toLowerCase().includes(q) ||
        x.location?.toLowerCase().includes(q) ||
        x.building.name.toLowerCase().includes(q)
      )
    }
    if (filterType) p = p.filter(x => x.panelType === filterType)
    if (filterBuilding) p = p.filter(x => x.building.id === filterBuilding)
    if (sortBy === 'type') p = [...p].sort((a, b) => a.panelType.localeCompare(b.panelType))
    return p
  }, [initialPanels, search, filterType, filterBuilding, sortBy])

  // Group by building
  const grouped = useMemo(() => {
    const map = new Map<string, { building: Building; panels: Panel[] }>()
    filtered.forEach(p => {
      const key = p.building.id
      if (!map.has(key)) map.set(key, { building: p.building, panels: [] })
      map.get(key)!.panels.push(p)
    })
    return Array.from(map.values()).sort((a, b) => a.building.name.localeCompare(b.building.name))
  }, [filtered])

  function toggleBuilding(id: string) {
    setCollapsed(c => ({ ...c, [id]: !c[id] }))
  }
  function toggleAll() {
    const next = !allCollapsed
    setAllCollapsed(next)
    const newState: Record<string, boolean> = {}
    grouped.forEach(g => { newState[g.building.id] = next })
    setCollapsed(newState)
  }

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panels</h1>
          <p className="text-gray-500 text-sm">{filtered.length} of {initialPanels.length} panels</p>
        </div>
        {canDirectEdit(userRole) && (
          <Link
            href="/panels/new"
            className="bg-[#003865] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            + New Panel
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search panels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterBuilding}
          onChange={e => setFilterBuilding(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Buildings</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.abbrev} – {b.name}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="designation">Sort: Designation</option>
          <option value="type">Sort: Type</option>
        </select>
        <button
          onClick={toggleAll}
          className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-300 rounded-lg"
        >
          {allCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
      </div>

      {/* Panel groups */}
      <div className="space-y-3">
        {grouped.map(({ building, panels }) => (
          <div key={building.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Building header */}
            <button
              onClick={() => toggleBuilding(building.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#003865] mono text-sm">{building.abbrev}</span>
                <span className="text-gray-700 font-medium text-sm">{building.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{panels.length}</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${collapsed[building.id] ? '-rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Panels */}
            {!collapsed[building.id] && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {panels.map(panel => (
                  <Link
                    key={panel.id}
                    href={`/panels/${panel.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                  >
                    {/* Type indicator */}
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[panel.panelType] || '#6b7280' }}
                    />
                    {/* Designation */}
                    <span className="mono font-semibold text-sm text-gray-900 w-32 flex-shrink-0">
                      {panel.designation}
                    </span>
                    {/* Type badge */}
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 hidden sm:block"
                      style={{ backgroundColor: TYPE_COLORS[panel.panelType] || '#6b7280' }}
                    >
                      {TYPE_LABELS[panel.panelType] || panel.panelType}
                    </span>
                    {/* Location */}
                    <span className="text-xs text-gray-500 flex-1 truncate hidden md:block">
                      {panel.location}
                    </span>
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                      <span>{panel.circuitCount} ccts</span>
                      {panel._count.photos > 0 && <span>📷 {panel._count.photos}</span>}
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No panels found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </main>
  )
}
