import bcrypt from 'bcrypt'
import { db } from './db/index.js'
import { users } from './db/schema.js'
import { config } from './config.js'

const SALT_ROUNDS = 12

async function seed() {
  console.log(`Seeding admin user: ${config.ADMIN_USER}`)

  const passwordHash = await bcrypt.hash(config.ADMIN_PASS, SALT_ROUNDS)

  await db
    .insert(users)
    .values({
      username: config.ADMIN_USER,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.username,
      set: { passwordHash },
    })

  console.log('Admin user seeded successfully')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
