'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CircuitTable from '@/components/CircuitTable'
import { PANEL_TYPES } from '@/lib/types'
import { canDirectEdit, canEdit, ROLE_LABELS } from '@/lib/auth'

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  HYDRO:        { bg: '#1a1a1a', text: '#ffffff', label: 'Hydro' },
  VITAL:        { bg: '#dc2626', text: '#ffffff', label: 'Vital' },
  DELAYED_VITAL:{ bg: '#2563eb', text: '#ffffff', label: 'Delayed Vital' },
  UPS:          { bg: '#ea580c', text: '#ffffff', label: 'UPS' },
}

interface Props {
  panel: any
  buildings: any[]
  userRole: string
  userId: string
}

export default function PanelDetailClient({ panel: initialPanel, buildings, userRole, userId }: Props) {
  const router = useRouter()
  const [panel, setPanel] = useState(initialPanel)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [activeTab, setActiveTab] = useState<'circuits' | 'files' | 'history'>('circuits')

  const type = TYPE_COLORS[panel.panelType] || TYPE_COLORS.HYDRO

  function startEdit() {
    setEditForm({
      designation: panel.designation,
      buildingId: panel.buildingId,
      manufacturer: panel.manufacturer ?? '',
      description: panel.description ?? '',
      location: panel.location ?? '',
      voltage: panel.voltage ?? '',
      fedFrom: panel.fedFrom ?? '',
      main: panel.main ?? '',
      panelType: panel.panelType,
      circuitCount: panel.circuitCount,
      notes: panel.notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    const res = await fetch(`/api/panels/${panel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        circuitCount: parseInt(editForm.circuitCount),
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPanel({ ...panel, ...updated })
      setEditing(false)
      router.refresh()
    } else {
      alert('Save failed')
    }
    setSaving(false)
  }

  const handleCircuitUpdate = useCallback(async (circuitId: string, data: any) => {
    const res = await fetch(`/api/circuits/${circuitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to save circuit')
    const result = await res.json()

    if (result.requiresApproval) {
      alert('Your change has been submitted for approval.')
      return
    }

    // Update local circuit state
    setPanel((prev: any) => ({
      ...prev,
      circuits: prev.circuits.map((c: any) => {
        if (c.id === circuitId) return { ...c, ...data }
        // Also update spanned circuits if poles changed
        if (data.poles && data.poles > 1) {
          const parent = prev.circuits.find((x: any) => x.id === circuitId)
          if (parent) {
            for (let i = 1; i < data.poles; i++) {
              if (c.circuitNumber === parent.circuitNumber + i * 2) {
                return { ...c, amperage: null }
              }
            }
          }
        }
        return c
      }),
    }))
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'sld') {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('panelId', panel.id)
    fd.append('type', type)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const record = await res.json()
      setPanel((prev: any) => ({
        ...prev,
        photos: type === 'photo' ? [...prev.photos, record] : prev.photos,
        slds: type === 'sld' ? [...prev.slds, record] : prev.slds,
      }))
    } else {
      alert('Upload failed')
    }
    setUploadingFile(false)
    e.target.value = ''
  }

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/panels" className="hover:text-blue-600">Panels</Link>
        <span>/</span>
        <span className="mono font-medium text-gray-900">{panel.designation}</span>
      </div>

      {/* Panel header */}
      <div
        className="rounded-xl text-white p-5 mb-6 flex items-start justify-between gap-4"
        style={{ backgroundColor: type.bg }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold mono">{panel.designation}</h1>
            <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
              {type.label}
            </span>
          </div>
          <p className="opacity-80 text-sm">{panel.description || panel.building.name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/panels/${panel.id}/print`}
            target="_blank"
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            🖨 Print
          </Link>
          <Link
            href={`/qr-codes?panel=${panel.id}`}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            📱 QR
          </Link>
          {canDirectEdit(userRole) && !editing && (
            <button
              onClick={startEdit}
              className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              ✎ Edit
            </button>
          )}
        </div>
      </div>

      {/* Edit panel form */}
      {editing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Edit Panel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Designation" value={editForm.designation} onChange={v => setEditForm((f: any) => ({ ...f, designation: v }))} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Building</label>
              <select
                value={editForm.buildingId}
                onChange={e => setEditForm((f: any) => ({ ...f, buildingId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {buildings.map(b => <option key={b.id} value={b.id}>{b.abbrev} – {b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Panel Type</label>
              <select
                value={editForm.panelType}
                onChange={e => setEditForm((f: any) => ({ ...f, panelType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="HYDRO">Hydro (Black)</option>
                <option value="VITAL">Vital (Red)</option>
                <option value="DELAYED_VITAL">Delayed Vital (Blue)</option>
                <option value="UPS">UPS (Orange)</option>
              </select>
            </div>
            <Field label="Manufacturer" value={editForm.manufacturer} onChange={v => setEditForm((f: any) => ({ ...f, manufacturer: v }))} />
            <Field label="Location" value={editForm.location} onChange={v => setEditForm((f: any) => ({ ...f, location: v }))} />
            <Field label="Voltage" value={editForm.voltage} onChange={v => setEditForm((f: any) => ({ ...f, voltage: v }))} />
            <Field label="Fed From" value={editForm.fedFrom} onChange={v => setEditForm((f: any) => ({ ...f, fedFrom: v }))} />
            <Field label="Main" value={editForm.main} onChange={v => setEditForm((f: any) => ({ ...f, main: v }))} />
            <Field label="# Circuits" value={String(editForm.circuitCount)} onChange={v => setEditForm((f: any) => ({ ...f, circuitCount: v }))} type="number" />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={editForm.description}
              onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="bg-[#003865] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Panel info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <InfoCard label="Building" value={panel.building.abbrev} />
        <InfoCard label="Location" value={panel.location} wide />
        <InfoCard label="Fed From" value={panel.fedFrom} />
        <InfoCard label="Voltage" value={panel.voltage} />
        <InfoCard label="Main" value={panel.main} />
        <InfoCard label="Manufacturer" value={panel.manufacturer} />
        <InfoCard label="Circuits" value={String(panel.circuitCount)} />
      </div>

      {/* Notes */}
      {panel.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
          <span className="font-semibold">⚠ Notes: </span>{panel.notes}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-1">
        {(['circuits', 'files', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white border border-b-white border-gray-200 text-[#003865] -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'circuits' ? `Circuits (${panel.circuitCount})` : tab === 'files' ? `Files (${panel.photos.length + panel.slds.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* Circuits tab */}
      {activeTab === 'circuits' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <CircuitTable
            circuits={panel.circuits}
            circuitCount={panel.circuitCount}
            panelId={panel.id}
            canEdit={canEdit(userRole)}
            onUpdate={handleCircuitUpdate}
          />
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-6">
          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Photos</h3>
              {canEdit(userRole) && (
                <label className="cursor-pointer bg-[#003865] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-900">
                  + Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'photo')} />
                </label>
              )}
            </div>
            {panel.photos.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {panel.photos.map((photo: any) => (
                  <a key={photo.id} href={photo.path} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.path}
                      alt={photo.caption || 'Panel photo'}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                    />
                    {photo.caption && <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* SLDs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Single Line Diagrams</h3>
              {canEdit(userRole) && (
                <label className="cursor-pointer bg-[#003865] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-900">
                  + Upload SLD
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFileUpload(e, 'sld')} />
                </label>
              )}
            </div>
            {panel.slds.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No SLDs uploaded</p>
            ) : (
              <div className="space-y-2">
                {panel.slds.map((sld: any) => (
                  <a
                    key={sld.id}
                    href={sld.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sld.title || sld.filename}</div>
                      <div className="text-xs text-gray-500">{sld.filename}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          {uploadingFile && <p className="text-sm text-blue-600">Uploading...</p>}
        </div>
      )}

      {/* History tab - placeholder */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 italic">Audit history coming soon.</p>
        </div>
      )}
    </main>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function InfoCard({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800 truncate">{value || '—'}</div>
    </div>
  )
}
