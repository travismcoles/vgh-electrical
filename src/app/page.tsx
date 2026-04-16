import { getServerSession } from 'next-auth'
import { authOptions, canApprove, canManageUsers } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = (session.user as any).role

  const [panelCount, buildingCount, pendingRequests] = await Promise.all([
    prisma.panel.count(),
    prisma.building.count(),
    canApprove(role) ? prisma.changeRequest.count({ where: { status: 'PENDING' } }) : 0,
  ])

  const recentPanels = await prisma.panel.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: { building: true },
  })

  const panelsByType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    orderBy: { _count: { panelType: 'desc' } },
  })

  const TYPE_COLORS: Record<string, string> = {
    HYDRO: '#1a1a1a',
    VITAL: '#dc2626',
    DELAYED_VITAL: '#2563eb',
    UPS: '#ea580c',
  }
  const TYPE_LABELS: Record<string, string> = {
    HYDRO: 'Hydro',
    VITAL: 'Vital',
    DELAYED_VITAL: 'Delayed Vital',
    UPS: 'UPS',
  }

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {session.user?.name} — VGH Electrical Panel Directory
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Panels" value={panelCount} href="/panels" color="#003865" />
          <StatCard label="Buildings" value={buildingCount} href="/panels" color="#0072CE" />
          <StatCard label="Pending Requests" value={pendingRequests} href="/change-requests" color={pendingRequests > 0 ? '#dc2626' : '#6b7280'} />
          <StatCard label="Panel Types" value={panelsByType.length} href="/panels" color="#78BE20" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Panel types breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Panels by Type</h2>
            <div className="space-y-3">
              {panelsByType.map(({ panelType, _count }) => (
                <div key={panelType} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[panelType] || '#6b7280' }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">{TYPE_LABELS[panelType] || panelType}</span>
                      <span className="text-sm font-semibold text-gray-900">{(_count as any).panelType}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(((_count as any).panelType) / panelCount) * 100}%`,
                          backgroundColor: TYPE_COLORS[panelType] || '#6b7280',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently updated */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Recently Updated</h2>
              <Link href="/panels" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
            <div className="space-y-2">
              {recentPanels.map(panel => (
                <Link
                  key={panel.id}
                  href={`/panels/${panel.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[panel.panelType] || '#6b7280' }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 mono">{panel.designation}</div>
                    <div className="text-xs text-gray-500 truncate">{panel.building.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/panels" icon="🗂" label="All Panels" />
          <QuickAction href="/search" icon="🔍" label="Search" />
          <QuickAction href="/qr-codes" icon="📱" label="QR Codes" />
          {canApprove(role) && <QuickAction href="/change-requests" icon="📋" label="Review Requests" badge={pendingRequests} />}
          {canManageUsers(role) && <QuickAction href="/import" icon="📥" label="Import Excel" />}
          {canManageUsers(role) && <QuickAction href="/users" icon="👥" label="Manage Users" />}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, href, color }: { label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </Link>
  )
}

function QuickAction({ href, icon, label, badge }: { href: string; icon: string; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-blue-300 hover:shadow-md transition-all text-center relative"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </Link>
  )
}
