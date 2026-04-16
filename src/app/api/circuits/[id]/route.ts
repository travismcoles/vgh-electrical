import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canEdit, canDirectEdit } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!canEdit(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const { description, amperage, poles, notes } = body

  const circuit = await prisma.circuit.findUnique({ where: { id: params.id } })
  if (!circuit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If electrician/subcontractor, they go through change request workflow
  if (!canDirectEdit(role)) {
    // Create change request instead
    const cr = await prisma.changeRequest.create({
      data: {
        panelId: circuit.panelId,
        submittedBy: (session.user as any).id,
        type: 'CIRCUIT_EDIT',
        fieldName: `circuit_${circuit.circuitNumber}`,
        oldValue: circuit.description ?? '',
        newValue: description ?? '',
        description: `Circuit ${circuit.circuitNumber}: "${circuit.description}" → "${description}"`,
      },
    })
    return NextResponse.json({ changeRequest: cr, requiresApproval: true })
  }

  // Direct edit for admin/chargehand
  const newPoles = poles ?? circuit.poles

  // If poles increased, clear spanned circuits
  if (newPoles > 1) {
    const spannedNumbers = []
    for (let i = 1; i < newPoles; i++) {
      spannedNumbers.push(circuit.circuitNumber + i * 2)
    }
    // Clear descriptions of spanned circuits (don't delete them)
    for (const num of spannedNumbers) {
      await prisma.circuit.updateMany({
        where: { panelId: circuit.panelId, circuitNumber: num },
        data: { amperage: null, poles: 1 },
      })
    }
  }

  const updated = await prisma.circuit.update({
    where: { id: params.id },
    data: {
      ...(description !== undefined && { description }),
      ...(amperage !== undefined && { amperage }),
      ...(poles !== undefined && { poles: newPoles }),
      ...(notes !== undefined && { notes }),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      panelId: circuit.panelId,
      action: 'UPDATE_CIRCUIT',
      details: `Updated circuit ${circuit.circuitNumber}`,
    },
  })

  return NextResponse.json(updated)
}
