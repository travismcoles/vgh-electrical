import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import PanelsClient from './_client'

export default async function PanelsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [panels, buildings] = await Promise.all([
    prisma.panel.findMany({
      include: {
        building: true,
        _count: { select: { circuits: true, photos: true } },
      },
      orderBy: { designation: 'asc' },
    }),
    prisma.building.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <Header />
      <PanelsClient
        initialPanels={panels as any}
        buildings={buildings}
        userRole={(session.user as any).role}
      />
    </div>
  )
}
