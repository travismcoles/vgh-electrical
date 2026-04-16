'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Link from 'next/link'
import { canApprove } from '@/lib/auth'

export default function ChangeRequestsPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<any[]>([])
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [loading, setLoading] = useState(true)

  const userRole = (session?.user as any)?.role || ''

  useEffect(() => {
    if (!session) return
    setLoading(true)
    fetch(`/api/change-requests?status=${tab}`)
      .then(r => r.json())
      .then(data => { setRequests(data); setLoading(false) })
  }, [session, tab])

  async function handleAction(id: string, action: 'APPROVED' | 'REJECTED') {
    const reviewNote = action === 'REJECTED' ? prompt('Reason for rejection (optional):') ?? '' : ''
    const res = await fetch(`/api/change-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewNote }),
    })
    if (res.ok) {
      setRequests(prev => prev.filter(r => r.id !== id))
    }
  }

  if (!session) return null

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Change Requests</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-[#003865] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No {tab.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/panels/${req.panel.id}`} className="mono font-bold text-[#003865] hover:underline">
                        {req.panel.designation}
                      </Link>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {req.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{req.description}</p>
                    {req.oldValue && (
                      <div className="text-xs text-gray-500">
                        <span className="line-through text-red-400 mr-2">{req.oldValue}</span>
                        <span className="text-green-600">→ {req.newValue}</span>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      Submitted by <strong>{req.user.name}</strong> ({req.user.role}) ·{' '}
                      {new Date(req.createdAt).toLocaleString('en-CA')}
                    </div>
                    {req.reviewNote && (
                      <div className="mt-1 text-xs text-gray-500 italic">Note: {req.reviewNote}</div>
                    )}
                  </div>

                  {tab === 'PENDING' && canApprove(userRole) && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAction(req.id, 'APPROVED')}
                        className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-600 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'REJECTED')}
                        className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 font-medium"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {tab !== 'PENDING' && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      tab === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tab}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
