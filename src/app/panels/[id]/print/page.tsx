import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import PrintView from './_print'

export default async function PrintPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const panel = await prisma.panel.findUnique({
    where: { id: params.id },
    include: {
      building: true,
      circuits: { orderBy: { circuitNumber: 'asc' } },
    },
  })

  if (!panel) notFound()

  return <PrintView panel={panel as any} />
}
