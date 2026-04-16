import { getServerSession } from 'next-auth'
import { authOptions, canDirectEdit } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import NewPanelClient from './_client'

export default async function NewPanelPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = (session.user as any).role
  if (!canDirectEdit(role)) redirect('/panels')

  const buildings = await prisma.building.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <Header />
      <NewPanelClient buildings={buildings} />
    </div>
  )
}
