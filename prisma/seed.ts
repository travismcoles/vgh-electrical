import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const BUILDINGS = [
  { name: '12th Avenue Switchroom', abbrev: '12AVE' },
  { name: 'Alumni Centre', abbrev: 'AC' },
  { name: 'Banfield Pavilion', abbrev: 'BP' },
  { name: 'Blusson Spinal Cord Centre', abbrev: 'BSCC' },
  { name: 'Leon Judah Blackmore Pavilion (formerly CP)', abbrev: 'CP' },
  { name: "Doctor's Residence", abbrev: 'DR' },
  { name: 'Energy Centre', abbrev: 'EC' },
  { name: 'Eye Care Centre', abbrev: 'ECC' },
  { name: 'Heather Pavilion', abbrev: 'HP' },
  { name: 'Heather Pavilion East', abbrev: 'HPE' },
  { name: 'Jack Bell Research Institute', abbrev: 'JB' },
  { name: 'Jim Pattison North', abbrev: 'JPN' },
  { name: 'Jim Pattison South', abbrev: 'JPS' },
  { name: 'Kids In General', abbrev: 'KIG' },
  { name: 'Laundry', abbrev: 'LAU' },
  { name: 'Physical Plant', abbrev: 'PP' },
  { name: 'Power House', abbrev: 'PH' },
  { name: 'Research Pavilion', abbrev: 'RP' },
  { name: 'Robert Ho', abbrev: 'RHNH' },
  { name: 'Segal', abbrev: 'Segal' },
  { name: 'Skin Care Centre', abbrev: 'SCC' },
  { name: 'Standby Power Plant', abbrev: 'SBPP' },
  { name: 'Tzu Chi Institute', abbrev: 'TC' },
  { name: 'VGH Parkade', abbrev: 'PKG' },
  { name: 'Willow Pavilion', abbrev: 'WP' },
]

async function main() {
  console.log('Seeding database...')

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@vch.ca' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@vch.ca',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✓ Admin user created (admin@vch.ca / admin123)')
  console.log('  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!')

  // Create buildings
  for (const b of BUILDINGS) {
    await prisma.building.upsert({
      where: { abbrev: b.abbrev },
      update: { name: b.name },
      create: b,
    })
  }
  console.log(`✓ ${BUILDINGS.length} buildings created`)

  // Sample panels
  const jpn = await prisma.building.findUnique({ where: { abbrev: 'JPN' } })
  const jps = await prisma.building.findUnique({ where: { abbrev: 'JPS' } })
  const scc = await prisma.building.findUnique({ where: { abbrev: 'SCC' } })
  const wp = await prisma.building.findUnique({ where: { abbrev: 'WP' } })

  if (jpn && jps && scc && wp) {
    const samplePanels = [
      {
        designation: 'JPN EP3H',
        buildingId: jpn.id,
        description: 'Emergency Power Panel 3H',
        location: 'Level 3, Electrical Room 3H',
        voltage: '120/208V',
        fedFrom: 'JPN MDP-EP',
        main: '100A',
        manufacturer: 'Siemens',
        panelType: 'VITAL',
        circuitCount: 42,
      },
      {
        designation: 'JPS N12F',
        buildingId: jps.id,
        description: 'Normal Power Panel 12F',
        location: 'Level 12, Corridor F',
        voltage: '120/208V',
        fedFrom: 'JPS NDP-12',
        main: '60A',
        manufacturer: 'Square D',
        panelType: 'HYDRO',
        circuitCount: 24,
      },
      {
        designation: 'SCC A',
        buildingId: scc.id,
        description: 'Main Distribution Panel A',
        location: 'Ground Floor, Main Electrical Room',
        voltage: '347/600V',
        fedFrom: 'SCC MDP',
        main: '400A',
        manufacturer: 'Eaton',
        panelType: 'HYDRO',
        circuitCount: 12,
      },
      {
        designation: 'WP GB',
        buildingId: wp.id,
        description: 'UPS Panel Ground Floor B',
        location: 'Ground Floor, Server Room',
        voltage: '120/208V',
        fedFrom: 'WP UPS-1',
        main: '30A',
        manufacturer: 'GE',
        panelType: 'UPS',
        circuitCount: 24,
        notes: 'Critical UPS panel - do not interrupt without maintenance coordination',
      },
    ]

    for (const panelData of samplePanels) {
      const existing = await prisma.panel.findUnique({ where: { designation: panelData.designation } })
      if (!existing) {
        const panel = await prisma.panel.create({ data: panelData })
        // Seed some circuits
        const circuits = []
        for (let i = 1; i <= Math.min(panelData.circuitCount, 12); i++) {
          circuits.push({
            panelId: panel.id,
            circuitNumber: i,
            description: i <= 6 ? `Sample Circuit ${i}` : null,
            amperage: '20A',
            poles: 1,
          })
        }
        await (prisma.circuit as any).createMany({ data: circuits })
      }
    }
    console.log('✓ Sample panels and circuits created')
  }

  console.log('\n✅ Database seeded successfully!')
  console.log('   Login: admin@vch.ca / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
