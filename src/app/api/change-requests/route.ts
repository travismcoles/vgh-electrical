import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canApprove } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'

  const where: any = { status }

  // Non-approvers can only see their own requests
  if (!canApprove(role)) {
    where.submittedBy = userId
  }

  const requests = await prisma.changeRequest.findMany({
    where,
    include: {
      panel: { select: { id: true, designation: true } },
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { panelId, type, fieldName, oldValue, newValue, description } = body

  if (!panelId || !type) {
    return NextResponse.json({ error: 'panelId and type required' }, { status: 400 })
  }

  const cr = await prisma.changeRequest.create({
    data: {
      panelId,
      submittedBy: (session.user as any).id,
      type,
      fieldName,
      oldValue,
      newValue,
      description,
    },
    include: {
      panel: { select: { designation: true } },
      user: { select: { name: true } },
    },
  })

  return NextResponse.json(cr, { status: 201 })
}
