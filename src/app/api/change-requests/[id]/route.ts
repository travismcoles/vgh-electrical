import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canApprove } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!canApprove(role)) {
    return NextResponse.json({ error: 'Approvers only' }, { status: 403 })
  }

  const { action, reviewNote } = await req.json() // action: 'APPROVED' | 'REJECTED'

  const cr = await prisma.changeRequest.findUnique({ where: { id: params.id } })
  if (!cr) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cr.status !== 'PENDING') return NextResponse.json({ error: 'Already reviewed' }, { status: 400 })

  const updated = await prisma.changeRequest.update({
    where: { id: params.id },
    data: {
      status: action,
      reviewedBy: (session.user as any).id,
      reviewNote,
    },
  })

  // If approved, apply the change
  if (action === 'APPROVED' && cr.type === 'CIRCUIT_EDIT' && cr.fieldName) {
    // fieldName format: "circuit_10"
    const circuitNum = parseInt(cr.fieldName.replace('circuit_', ''))
    const circuit = await prisma.circuit.findFirst({
      where: { panelId: cr.panelId, circuitNumber: circuitNum },
    })
    if (circuit) {
      await prisma.circuit.update({
        where: { id: circuit.id },
        data: { description: cr.newValue },
      })
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      panelId: cr.panelId,
      action: `CHANGE_REQUEST_${action}`,
      details: `${action} change request: ${cr.description}`,
    },
  })

  return NextResponse.json(updated)
}
