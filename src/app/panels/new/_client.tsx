'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPanelClient({ buildings }: { buildings: any[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    designation: '', buildingId: buildings[0]?.id ?? '', manufacturer: '',
    description: '', location: '', voltage: '', fedFrom: '', main: '',
    panelType: 'HYDRO', circuitCount: '24', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/panels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, circuitCount: parseInt(form.circuitCount) }),
    })
    if (res.ok) {
      const panel = await res.json()
      router.push(`/panels/${panel.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create panel')
      setSaving(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/panels" className="hover:text-blue-600">Panels</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New Panel</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Panel</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Panel Designation *" value={form.designation} onChange={(v: any) => update('designation', v)} placeholder="e.g. JPN EP3H" />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Building *</label>
            <select value={form.buildingId} onChange={e => update('buildingId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {buildings.map(b => <option key={b.id} value={b.id}>{b.abbrev} – {b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Panel Type</label>
            <select value={form.panelType} onChange={e => update('panelType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="HYDRO">Hydro (Black)</option>
              <option value="VITAL">Vital (Red)</option>
              <option value="DELAYED_VITAL">Delayed Vital (Blue)</option>
              <option value="UPS">UPS (Orange)</option>
            </select>
          </div>
          <Field label="Number of Circuits" value={form.circuitCount} onChange={(v: any) => update('circuitCount', v)} type="number" />
          <Field label="Manufacturer" value={form.manufacturer} onChange={(v: any) => update('manufacturer', v)} />
          <Field label="Voltage" value={form.voltage} onChange={(v: any) => update('voltage', v)} placeholder="e.g. 120/208V" />
          <Field label="Location" value={form.location} onChange={(v: any) => update('location', v)} placeholder="Level 3, Electrical Room..." />
          <Field label="Fed From" value={form.fedFrom} onChange={(v: any) => update('fedFrom', v)} />
          <Field label="Main" value={form.main} onChange={(v: any) => update('main', v)} placeholder="e.g. 100A" />
        </div>
        <Field label="Description" value={form.description} onChange={(v: any) => update('description', v)} placeholder="What this panel serves..." />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleCreate} disabled={saving || !form.designation}
            className="bg-[#003865] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Panel'}
          </button>
          <Link href="/panels" className="px-6 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</Link>
        </div>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}
