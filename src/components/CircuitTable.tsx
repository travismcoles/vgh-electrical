'use client'
import { useState, useCallback } from 'react'
import { getPhaseColor } from '@/lib/types'

interface Circuit {
  id: string
  circuitNumber: number
  description: string | null
  amperage: string | null
  poles: number
  notes?: string | null
}

interface Props {
  circuits: Circuit[]
  circuitCount: number
  panelId: string
  canEdit: boolean
  onUpdate: (circuitId: string, data: Partial<Circuit>) => Promise<void>
}

type EditingState = {
  circuitId: string
  description: string
  amperage: string
  poles: number
} | null

// ── Moved OUTSIDE main component so React never remounts it ──
interface CircuitCellProps {
  num: number
  circuit: Circuit | undefined
  parent: Circuit | null
  editing: EditingState
  saving: boolean
  canEdit: boolean
  onEdit: (circuit: Circuit) => void
  onSave: () => void
  onCancel: () => void
  onEditingChange: (val: EditingState) => void
}

function CircuitCell({
  num,
  circuit,
  parent,
  editing,
  saving,
  canEdit,
  onEdit,
  onSave,
  onCancel,
  onEditingChange,
}: CircuitCellProps) {
  const isEditing = editing && circuit && editing.circuitId === circuit.id
  const phaseColor = getPhaseColor(num)
  const isSpanned = !!parent
  const displayPoles = parent?.poles ?? circuit?.poles ?? 1

  let displayDesc = circuit?.description ?? ''
  if (isSpanned && !displayDesc) {
    displayDesc = parent?.description ?? ''
  }

  if (isEditing && circuit) {
    return (
      <div className="flex items-center gap-1 py-0.5">
        <span
          className="mono text-[11px] font-bold w-7 flex-shrink-0 text-right"
          style={{ color: phaseColor }}
        >
          {num}
        </span>

        <input
          type="text"
          value={editing.amperage}
          onChange={(e) => onEditingChange({ ...editing, amperage: e.target.value })}
          placeholder="15A"
          className="w-12 text-[11px] border border-blue-400 rounded px-1 py-0.5 mono"
        />

        <select
          value={editing.poles}
          onChange={(e) => onEditingChange({ ...editing, poles: parseInt(e.target.value) })}
          className="w-12 text-[11px] border border-blue-400 rounded px-1 py-0.5"
        >
          <option value={1}>1P</option>
          <option value={2}>2P</option>
          <option value={3}>3P</option>
        </select>

        <input
          type="text"
          value={editing.description}
          onChange={(e) => onEditingChange({ ...editing, description: e.target.value })}
          placeholder="Description..."
          className="flex-1 text-[11px] border border-blue-400 rounded px-1 py-0.5 min-w-0"
        />

        <button
          onClick={onSave}
          disabled={saving}
          className="w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded text-xs hover:bg-green-600 flex-shrink-0"
        >
          ✓
        </button>

        <button
          onClick={onCancel}
          className="w-6 h-6 flex items-center justify-center bg-gray-400 text-white rounded text-xs hover:bg-gray-500 flex-shrink-0"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 py-0.5 group min-h-[22px] ${isSpanned ? 'opacity-70' : ''}`}>
      <span
        className="mono text-[11px] font-bold w-7 flex-shrink-0 text-right"
        style={{ color: phaseColor }}
      >
        {num}
      </span>

      <span className={`mono text-[10px] w-10 flex-shrink-0 text-gray-500 ${isSpanned ? 'text-gray-300' : ''}`}>
        {isSpanned ? (parent?.amperage ?? '') : (circuit?.amperage ?? '')}
      </span>

      <span className="flex-1 text-[11px] min-w-0 truncate">
        {displayPoles > 1 && (
          <span className={`font-medium mr-0.5 ${isSpanned ? 'text-gray-400' : 'text-gray-600'}`}>
            {displayPoles}P
          </span>
        )}
        <span className={isSpanned ? 'italic text-gray-400' : 'text-gray-800'}>
          {displayDesc}
        </span>
      </span>

      {canEdit && !isSpanned && circuit && !editing && (
        <button
          onClick={() => onEdit(circuit)}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded text-xs flex-shrink-0 transition-opacity"
        >
          ✎
        </button>
      )}
    </div>
  )
}

// ── Main component ──
export default function CircuitTable({ circuits, circuitCount, panelId, canEdit, onUpdate }: Props) {
  const [editing, setEditing] = useState<EditingState>(null)
  const [saving, setSaving] = useState(false)

  const circuitMap = new Map<number, Circuit>()
  circuits.forEach(c => circuitMap.set(c.circuitNumber, c))

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

  const handleEdit = useCallback((circuit: Circuit) => {
    if (editing && editing.circuitId !== circuit.id) {
      alert('Please save or cancel the current edit first.')
      return
    }
    setEditing({
      circuitId: circuit.id,
      description: circuit.description ?? '',
      amperage: circuit.amperage ?? '',
      poles: circuit.poles,
    })
  }, [editing])

  const handleSave = useCallback(async () => {
    if (!editing) return
    setSaving(true)
    try {
      await onUpdate(editing.circuitId, {
        description: editing.description || null,
        amperage: editing.amperage || null,
        poles: editing.poles,
      })
      setEditing(null)
    } catch (err) {
      alert('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [editing, onUpdate])

  const oddNums: number[] = []
  const evenNums: number[] = []
  for (let i = 1; i <= circuitCount; i++) {
    if (i % 2 === 1) oddNums.push(i)
    else evenNums.push(i)
  }
  const rows = Math.max(oddNums.length, evenNums.length)

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-2 gap-x-4 min-w-[400px]">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-200">
          Circuits (Odd)
        </div>
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-200">
          Circuits (Even)
        </div>

        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="contents">
            <div key={`odd-${i}`} className="border-b border-gray-100">
              {oddNums[i] !== undefined ? (
                <CircuitCell
                  num={oddNums[i]}
                  circuit={circuitMap.get(oddNums[i])}
                  parent={getParent(oddNums[i])}
                  editing={editing}
                  saving={saving}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  onEditingChange={setEditing}
                />
              ) : <div className="min-h-[22px]" />}
            </div>
            <div key={`even-${i}`} className="border-b border-gray-100">
              {evenNums[i] !== undefined ? (
                <CircuitCell
                  num={evenNums[i]}
                  circuit={circuitMap.get(evenNums[i])}
                  parent={getParent(evenNums[i])}
                  editing={editing}
                  saving={saving}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  onEditingChange={setEditing}
                />
              ) : <div className="min-h-[22px]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}