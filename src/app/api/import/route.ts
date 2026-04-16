import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' })

  const results = { panels: 0, circuits: 0, errors: [] as string[] }

  // Sheet 1: Panels
  // Expected columns: Building, Panel Designation, Manufacturer, Description, Location, Voltage, Fed From, Fuse/Breaker, Circuits
  const panelSheet = workbook.Sheets[workbook.SheetNames[0]]
  const panelRows = XLSX.utils.sheet_to_json<any>(panelSheet, { defval: '' })

  for (const row of panelRows) {
    const designation = (row['Panel Designation'] || row['designation'] || '').toString().trim()
    if (!designation) continue

    // Find or guess building from designation prefix
    const abbrev = designation.split(' ')[0].replace(/[0-9]/g, '').toUpperCase()
    let building = await prisma.building.findFirst({
      where: { OR: [{ abbrev }, { abbrev: designation.substring(0, 2) }, { abbrev: designation.substring(0, 3) }] },
    })

    if (!building) {
      // Create building if not found
      building = await prisma.building.upsert({
        where: { abbrev: abbrev || 'UNK' },
        update: {},
        create: { name: `Building ${abbrev}`, abbrev: abbrev || 'UNK' },
      })
    }

    const circuitCount = parseInt(row['Circuits'] || row['circuitCount'] || '24') || 24

    try {
      const panel = await prisma.panel.upsert({
        where: { designation },
        update: {
          manufacturer: row['Manufacturer']?.toString() || null,
          description: row['Description']?.toString() || null,
          location: row['Location']?.toString() || null,
          voltage: row['Voltage']?.toString() || null,
          fedFrom: (row['Fed From'] || row['FedFrom'])?.toString() || null,
          main: (row['Fuse/Breaker'] || row['Main'] || row['main'])?.toString() || null,
          circuitCount,
          buildingId: building.id,
        },
        create: {
          designation,
          buildingId: building.id,
          manufacturer: row['Manufacturer']?.toString() || null,
          description: row['Description']?.toString() || null,
          location: row['Location']?.toString() || null,
          voltage: row['Voltage']?.toString() || null,
          fedFrom: (row['Fed From'] || row['FedFrom'])?.toString() || null,
          main: (row['Fuse/Breaker'] || row['Main'] || row['main'])?.toString() || null,
          panelType: 'HYDRO',
          circuitCount,
        },
      })

      // Ensure circuit slots exist
      for (let i = 1; i <= circuitCount; i++) {
        await prisma.circuit.upsert({
          where: { panelId_circuitNumber: { panelId: panel.id, circuitNumber: i } },
          update: {},
          create: { panelId: panel.id, circuitNumber: i, poles: 1 },
        })
      }

      results.panels++
    } catch (e: any) {
      results.errors.push(`Panel ${designation}: ${e.message}`)
    }
  }

  // Sheet 2: Circuits
  // Expected columns: Panel Designation, Circuit Number, Description
  if (workbook.SheetNames.length > 1) {
    const circuitSheet = workbook.Sheets[workbook.SheetNames[1]]
    const circuitRows = XLSX.utils.sheet_to_json<any>(circuitSheet, { defval: '' })

    for (const row of circuitRows) {
      const designation = (row['Panel Designation'] || '').toString().trim()
      const circuitNum = parseInt(row['Circuit Number'] || row['Circuit'] || '0')
      const description = (row['Description'] || '').toString().trim()

      if (!designation || !circuitNum) continue

      const panel = await prisma.panel.findUnique({ where: { designation } })
      if (!panel) {
        results.errors.push(`Circuit row: panel "${designation}" not found`)
        continue
      }

      try {
        await prisma.circuit.upsert({
          where: { panelId_circuitNumber: { panelId: panel.id, circuitNumber: circuitNum } },
          update: { description: description || null },
          create: { panelId: panel.id, circuitNumber: circuitNum, description: description || null, poles: 1 },
        })
        results.circuits++
      } catch (e: any) {
        results.errors.push(`Circuit ${designation}/${circuitNum}: ${e.message}`)
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'IMPORT_EXCEL',
      details: `Imported ${results.panels} panels, ${results.circuits} circuits`,
    },
  })

  return NextResponse.json(results)
}
