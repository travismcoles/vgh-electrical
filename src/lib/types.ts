export const PANEL_TYPES = {
  HYDRO: { label: 'Hydro', color: '#1a1a1a', bg: '#1a1a1a', text: '#ffffff' },
  VITAL: { label: 'Vital', color: '#dc2626', bg: '#dc2626', text: '#ffffff' },
  DELAYED_VITAL: { label: 'Delayed Vital', color: '#2563eb', bg: '#2563eb', text: '#ffffff' },
  UPS: { label: 'UPS', color: '#ea580c', bg: '#ea580c', text: '#ffffff' },
} as const

export type PanelTypeKey = keyof typeof PANEL_TYPES

// Phase colors for circuit numbers (1,7,13...=Red; 3,9,15...=Black; 5,11,17...=Blue, then repeat)
export function getPhaseColor(circuitNumber: number): string {
  const pos = Math.ceil(circuitNumber / 2) // 1→1,2→1,3→2,4→2...
  const phase = ((pos - 1) % 3)
  if (phase === 0) return '#dc2626' // Red
  if (phase === 1) return '#1a1a1a' // Black
  return '#2563eb' // Blue
}

export interface CircuitRow {
  id?: string
  panelId: string
  circuitNumber: number
  description: string | null
  amperage: string | null
  poles: number
  notes?: string | null
}

export interface PanelWithRelations {
  id: string
  designation: string
  buildingId: string
  building: { id: string; name: string; abbrev: string }
  manufacturer: string | null
  description: string | null
  location: string | null
  voltage: string | null
  fedFrom: string | null
  main: string | null
  panelType: string
  circuitCount: number
  notes: string | null
  circuits: CircuitRow[]
  photos: { id: string; filename: string; path: string; caption: string | null }[]
  slds: { id: string; filename: string; path: string; title: string | null }[]
  updatedAt: string | Date
  createdAt: string | Date
}
