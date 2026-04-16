import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canDirectEdit } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const building = searchParams.get('building')
  const type = searchParams.get('type')
  const search = searchParams.get('q')

  const where: any = {}
  if (building) where.buildingId = building
  if (type) where.panelType = type
  if (search) {
    where.OR = [
      { designation: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { fedFrom: { contains: search, mode: 'insensitive' } },
    ]
  }

  const panels = await prisma.panel.findMany({
    where,
    include: {
      building: true,
      circuits: { orderBy: { circuitNumber: 'asc' } },
      photos: true,
      slds: true,
    },
    orderBy: { designation: 'asc' },
  })

  return NextResponse.json(panels)
}

export async function POST(req: NextRequest) {
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

  if (!designation || !buildingId) {
    return NextResponse.json({ error: 'designation and buildingId required' }, { status: 400 })
  }

  // Check if designation already exists
  const existing = await prisma.panel.findUnique({ where: { designation } })
  if (existing) {
    return NextResponse.json({ error: 'Panel designation already exists' }, { status: 409 })
  }

  const panel = await prisma.panel.create({
    data: {
      designation,
      buildingId,
      manufacturer,
      description,
      location,
      voltage,
      fedFrom,
      main,
      panelType: panelType || 'HYDRO',
      circuitCount: circuitCount || 24,
      notes,
    },
    include: { building: true, circuits: true, photos: true, slds: true },
  })

  // Auto-create empty circuit slots
  const circuitData = []
  for (let i = 1; i <= panel.circuitCount; i++) {
    circuitData.push({ panelId: panel.id, circuitNumber: i, poles: 1 })
  }
  await (prisma.circuit as any).createMany({ data: circuitData, skipDuplicates: true })

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      panelId: panel.id,
      action: 'CREATE_PANEL',
      details: `Created panel ${designation}`,
    },
  })

  return NextResponse.json(panel, { status: 201 })
}
