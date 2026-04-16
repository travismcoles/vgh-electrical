'use client'
import { getPhaseColor } from '@/lib/types'
import QRCode from 'react-qr-code'

const APP_VERSION = 'v0.5'

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  HYDRO:         { label: 'HYDRO',         color: '#1a1a1a' },
  VITAL:         { label: 'VITAL',         color: '#dc2626' },
  DELAYED_VITAL: { label: 'DELAYED VITAL', color: '#2563eb' },
  UPS:           { label: 'UPS',           color: '#ea580c' },
}

interface Circuit {
  id: string
  circuitNumber: number
  description: string | null
  amperage: string | null
  poles: number
}

interface Panel {
  id: string
  designation: string
  building: { name: string; abbrev: string }
  manufacturer: string | null
  description: string | null
  location: string | null
  voltage: string | null
  fedFrom: string | null
  main: string | null
  panelType: string
  circuitCount: number
  notes: string | null
  circuits: Circuit[]
  updatedAt: string | Date
}

export default function PrintView({ panel }: { panel: Panel }) {
  const typeConfig = TYPE_CONFIG[panel.panelType] || TYPE_CONFIG.HYDRO
  const typeColor = typeConfig.color
  const printedDate = new Date().toLocaleDateString('en-CA')
  const lastEdited = new Date(panel.updatedAt).toLocaleDateString('en-CA')

  const circuitMap = new Map<number, Circuit>()
  panel.circuits.forEach(c => circuitMap.set(c.circuitNumber, c))

  function getParent(num: number): Circuit | null {
    for (const [parentNum, c] of circuitMap) {
      if (c.poles > 1) {
        for (let i = 1; i < c.poles; i++) {
          if (parentNum + i * 2 === num) return c
        }
      }
    }
    return null
  }

  const oddNums: number[] = []
  const evenNums: number[] = []
  for (let i = 1; i <= panel.circuitCount; i++) {
    if (i % 2 === 1) oddNums.push(i)
    else evenNums.push(i)
  }
  const rows = Math.max(oddNums.length, evenNums.length)

  function CircuitRow({ num }: { num: number }) {
    const circuit = circuitMap.get(num)
    const parent = getParent(num)
    const isSpanned = !!parent
    const poles = parent?.poles ?? circuit?.poles ?? 1

    let displayDesc = circuit?.description ?? ''
    if (isSpanned && !displayDesc) displayDesc = parent?.description ?? ''

    const amperage = isSpanned ? (parent?.amperage ?? '') : (circuit?.amperage ?? '')
    const phaseColor = getPhaseColor(num)

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1.5px 2px',
        borderBottom: '0.5px solid #e5e7eb',
        opacity: isSpanned ? 0.75 : 1,
        minHeight: '16px',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '8.5pt', fontWeight: '700', color: phaseColor, width: '18px', textAlign: 'right', flexShrink: 0 }}>
          {num}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '7.5pt', color: isSpanned ? '#d1d5db' : '#6b7280', width: '26px', flexShrink: 0, textAlign: 'right' }}>
          {amperage}
        </span>
        <span style={{ fontSize: '8pt', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: isSpanned ? '#9ca3af' : '#111827', fontStyle: isSpanned ? 'italic' : 'normal' }}>
          {poles > 1 && <span style={{ color: isSpanned ? '#d1d5db' : '#6b7280', fontWeight: 600, marginRight: '2px', fontSize: '7.5pt' }}>{poles}P</span>}
          {displayDesc}
        </span>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 8mm 10mm 8mm 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 9pt; margin: 0; padding: 0; background: white; color: #111; }
        .page { width: 100%; max-width: 190mm; margin: 0 auto; display: flex; flex-direction: column; min-height: calc(100vh - 16mm); }
        @media screen {
          body { background: #f3f4f6; padding: 20px; }
          .page { background: white; padding: 12mm; box-shadow: 0 4px 24px rgba(0,0,0,0.15); min-height: 270mm; }
          .print-btn { position: fixed; top: 16px; right: 16px; background: #003865; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; z-index: 100; }
        }
        @media print { .print-btn { display: none !important; } .page { min-height: unset; padding: 0; box-shadow: none; } }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>

      <div className="page">
        <div style={{ borderLeft: `6px solid ${typeColor}`, paddingLeft: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '18pt', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '-0.5px', lineHeight: 1 }}>{panel.designation}</div>
            {panel.description && <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '2px' }}>{panel.description}</div>}
          </div>
          <div style={{ backgroundColor: typeColor, color: 'white', padding: '3px 10px', borderRadius: '4px', fontSize: '9pt', fontWeight: '700' }}>{typeConfig.label}</div>
        </div>

        {/* Info Grid - Custom Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '4px' }}>
            <InfoCell label="Location" value={panel.location} />
            <InfoCell label="Fed From" value={panel.fedFrom} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px' }}>
            <InfoCell label="Voltage" value={panel.voltage} />
            <InfoCell label="Main" value={panel.main} />
            <InfoCell label="Manufacturer" value={panel.manufacturer} />
            <InfoCell label="Circuits" value={String(panel.circuitCount)} />
          </div>
        </div>

        <div style={{ borderTop: `2px solid ${typeColor}`, marginBottom: '6px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', flex: 1 }}>
          {Array.from({ length: rows }, (_, i) => (
            <>
              <div key={`odd-${i}`} style={{ borderRight: '1px solid #e5e7eb', paddingRight: '6px' }}>
                {oddNums[i] !== undefined ? <CircuitRow num={oddNums[i]} /> : <div style={{ minHeight: '16px' }} />}
              </div>
              <div key={`even-${i}`}>
                {evenNums[i] !== undefined ? <CircuitRow num={evenNums[i]} /> : <div style={{ minHeight: '16px' }} />}
              </div>
            </>
          ))}
        </div>

        {/* Notes moved to bottom */}
        {panel.notes && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '4px', padding: '6px 10px', fontSize: '8pt', color: '#92400e', marginTop: '10px', marginBottom: '10px' }}>
            <strong>Panel Notes:</strong> {panel.notes}
          </div>
        )}

        {/* Centered QR Code at bottom */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
          <div style={{ padding: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
             <QRCode value={`${window.location.origin}/panels/${panel.id}`} size={60} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingBottom: '4px' }}>
          <p style={{ fontSize: '6.5pt', color: '#6b7280', textAlign: 'center', margin: '4px 0' }}>
            Property of VGH Electrical Dept. For internal FMO reference use only. All information shown requires verification.
          </p>
        </div>

        <div style={{ paddingTop: '6px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '7.5pt', color: '#9ca3af' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#003865', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78BE20', fontWeight: '800', fontSize: '7pt' }}>VCH</div>
            <div>
              <div style={{ fontSize: '7pt', fontWeight: '600', color: '#6b7280' }}>Vancouver Coastal Health</div>
              <div style={{ fontSize: '7pt' }}>Facilities Maintenance & Operations</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '6.5pt' }}>
            <div>Printed: {printedDate} | Last Edited: {lastEdited}</div>
            <div>{APP_VERSION}</div>
          </div>
        </div>
      </div>
    </>
  )
}

function InfoCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '3px 6px' }}>
      <div style={{ fontSize: '6pt', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '8.5pt', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
    </div>
  )
}