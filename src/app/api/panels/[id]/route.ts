import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canDirectEdit } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const panel = await prisma.panel.findUnique({
    where: { id: params.id },
    include: {
      building: true,
      circuits: { orderBy: { circuitNumber: 'asc' } },
      photos: true,
      slds: true,
    },
  })

  if (!panel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(panel)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!canDirectEdit(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const {
    designation, buildingId, manufacturer, description, location,
    voltage, fedFrom, main, panelType, circuitCount, notes,
  } = body

  const existing = await prisma.panel.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If circuitCount increased, add new empty circuits
  const newCount = circuitCount ?? existing.circuitCount
  if (newCount > existing.circuitCount) {
    const newCircuits = []
    for (let i = existing.circuitCount + 1; i <= newCount; i++) {
      newCircuits.push({ panelId: params.id, circuitNumber: i, poles: 1 })
    }
    if (newCircuits.length > 0) {
      await (prisma.circuit as any).createMany({ data: newCircuits, skipDuplicates: true })
    }
  }

  const panel = await prisma.panel.update({
    where: { id: params.id },
    data: {
      ...(designation && { designation }),
      ...(buildingId && { buildingId }),
      ...(manufacturer !== undefined && { manufacturer }),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location }),
      ...(voltage !== undefined && { voltage }),
      ...(fedFrom !== undefined && { fedFrom }),
      ...(main !== undefined && { main }),
      ...(panelType && { panelType }),
      ...(circuitCount !== undefined && { circuitCount: newCount }),
      ...(notes !== undefined && { notes }),
    },
    include: { building: true, circuits: { orderBy: { circuitNumber: 'asc' } }, photos: true, slds: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      panelId: panel.id,
      action: 'UPDATE_PANEL',
      details: `Updated panel ${panel.designation}`,
    },
  })

  return NextResponse.json(panel)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const panel = await prisma.panel.delete({ where: { id: params.id } })

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'DELETE_PANEL',
      details: `Deleted panel ${panel.designation}`,
    },
  })

  return NextResponse.json({ success: true })
}
