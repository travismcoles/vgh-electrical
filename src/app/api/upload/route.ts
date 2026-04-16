import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canEdit } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { saveFile } from '@/lib/upload'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!canEdit(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  const panelId = formData.get('panelId') as string
  const type = formData.get('type') as string // 'photo' | 'sld' | 'floorplan'
  const caption = formData.get('caption') as string

  if (!file || !panelId) {
    return NextResponse.json({ error: 'file and panelId required' }, { status: 400 })
  }

  const subfolder = type === 'sld' ? 'slds' : 'photos'
  const { filename, path } = await saveFile(file, subfolder)

  let record
  if (type === 'sld') {
    record = await prisma.sLD.create({
      data: { panelId, filename, path, title: caption },
    })
  } else {
    record = await prisma.photo.create({
      data: { panelId, filename, path, caption },
    })
  }

  return NextResponse.json(record, { status: 201 })
}
