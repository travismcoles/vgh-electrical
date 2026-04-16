'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'

export default function ImportPage() {
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  if (!session) return null

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.ok) {
      setResult(data)
    } else {
      setError(data.error || 'Import failed')
    }
    setLoading(false)
  }

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import from Excel</h1>
        <p className="text-gray-500 text-sm mb-8">Upload your exported MS Access Excel file to import panels and circuits.</p>

        <div className="max-w-2xl">
          {/* Format guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">Expected Excel Format</h3>
            <div className="space-y-3 text-sm text-blue-900">
              <div>
                <strong>Sheet 1 – Panels:</strong>
                <div className="mono text-xs bg-white border border-blue-100 rounded-lg p-2 mt-1">
                  Building | Panel Designation | Manufacturer | Description | Location | Voltage | Fed From | Fuse/Breaker | Circuits
                </div>
              </div>
              <div>
                <strong>Sheet 2 – Circuits:</strong>
                <div className="mono text-xs bg-white border border-blue-100 rounded-lg p-2 mt-1">
                  Panel Designation | Circuit Number | Description
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-3">
              💡 Existing panels will be updated. New panels will be created. Circuit count determines slot count.
            </p>
          </div>

          {/* Upload */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-600 font-medium mb-2">Select your Excel file</p>
            <p className="text-xs text-gray-400 mb-4">.xlsx or .xls format</p>
            <label className="cursor-pointer bg-[#003865] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 inline-block">
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <p className="text-sm text-green-600 mt-3 font-medium">✓ {file.name}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ Import Complete</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>Panels imported/updated: <strong>{result.panels}</strong></p>
                <p>Circuits imported/updated: <strong>{result.circuits}</strong></p>
                {result.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-amber-600 font-medium">{result.errors.length} warnings</summary>
                    <ul className="mt-2 space-y-1 text-xs text-amber-700">
                      {result.errors.map((e: string, i: number) => <li key={i}>⚠ {e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full bg-[#003865] text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Importing...' : 'Import Excel Data'}
          </button>
        </div>
      </main>
    </div>
  )
}
