import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/Header'
import PanelDetailClient from './_client'

export default async function PanelDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const panel = await prisma.panel.findUnique({
    where: { id: params.id },
    include: {
      building: true,
      circuits: { orderBy: { circuitNumber: 'asc' } },
      photos: true,
      slds: true,
    },
  })

  if (!panel) notFound()

  const buildings = await prisma.building.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <Header />
      <PanelDetailClient
        panel={panel as any}
        buildings={buildings}
        userRole={(session.user as any).role}
        userId={(session.user as any).id}
      />
    </div>
  )
}
