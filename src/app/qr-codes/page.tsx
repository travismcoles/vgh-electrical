'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import QRCode from 'qrcode'
import Link from 'next/link'

export default function QRCodesPage() {
  const { data: session } = useSession()
  const [panels, setPanels] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/panels').then(r => r.json()).then(data => {
      setPanels(data)
      setLoading(false)
    })
  }, [])

  async function getQR(panelId: string): Promise<string> {
    if (qrCodes[panelId]) return qrCodes[panelId]
    const url = `${window.location.origin}/panels/${panelId}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 200, margin: 1,
      color: { dark: '#003865', light: '#ffffff' },
    })
    setQrCodes(prev => ({ ...prev, [panelId]: dataUrl }))
    return dataUrl
  }

  const filtered = panels.filter(p =>
    p.designation.toLowerCase().includes(search.toLowerCase()) ||
    p.building?.name?.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function printSelected() {
    const selectedPanels = panels.filter(p => selected.has(p.id))
    if (selectedPanels.length === 0) return

    const codes = await Promise.all(
      selectedPanels.map(async p => ({
        panel: p,
        qr: await getQR(p.id),
      }))
    )

    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <html>
      <head>
        <title>QR Codes - VCH Electrical</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: white; margin: 0; padding: 12mm; }
          @page { size: letter; margin: 10mm; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
          .card {
            border: 1px solid #e5e7eb; border-radius: 6px;
            padding: 8px; text-align: center;
            page-break-inside: avoid;
          }
          .card img { width: 100%; max-width: 100px; }
          .designation { font-family: monospace; font-weight: 700; font-size: 9pt; color: #003865; margin-top: 4px; }
          .building { font-size: 7pt; color: #6b7280; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="grid">
          ${codes.map(({ panel, qr }) => `
            <div class="card">
              <img src="${qr}" alt="QR ${panel.designation}" />
              <div class="designation">${panel.designation}</div>
              <div class="building">${panel.building?.abbrev || ''}</div>
            </div>
          `).join('')}
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (!session) return null

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
            <p className="text-sm text-gray-500 mt-1">Generate and print QR codes for panel labels</p>
          </div>
          {selected.size > 0 && (
            <button
              onClick={printSelected}
              className="bg-[#003865] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900"
            >
              🖨 Print {selected.size} Selected
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="search"
            placeholder="Filter panels..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-[#003865]"
          />
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading panels...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(panel => (
              <QRCard
                key={panel.id}
                panel={panel}
                selected={selected.has(panel.id)}
                onToggle={() => toggleSelect(panel.id)}
                getQR={getQR}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function QRCard({ panel, selected, onToggle, getQR }: any) {
  const [qr, setQr] = useState<string | null>(null)

  async function load() {
    if (qr) return
    const code = await getQR(panel.id)
    setQr(code)
  }

  return (
    <div
      className={`bg-white border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-[#003865] shadow-md' : 'border-gray-200'
      }`}
      onClick={onToggle}
      onMouseEnter={load}
    >
      <div className="flex items-center justify-between mb-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          className="rounded"
        />
        <Link
          href={`/panels/${panel.id}`}
          onClick={e => e.stopPropagation()}
          className="text-[10px] text-blue-600 hover:underline"
        >
          View →
        </Link>
      </div>
      {qr ? (
        <img src={qr} alt={panel.designation} className="w-full aspect-square object-contain" />
      ) : (
        <div
          className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs"
          onClick={load}
        >
          Click to load
        </div>
      )}
      <div className="mt-2 text-center">
        <div className="mono text-xs font-bold text-[#003865] truncate">{panel.designation}</div>
        <div className="text-[10px] text-gray-400">{panel.building?.abbrev}</div>
      </div>
    </div>
  )
}
