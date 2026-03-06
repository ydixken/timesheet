import { pgTable, uuid, text, boolean, integer, numeric, date, time, timestamp } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  email:     text('email'),
  address:   text('address'),
  logoPath:  text('logo_path'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id:             uuid('id').primaryKey().defaultRandom(),
  clientId:       uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  name:           text('name').notNull(),
  color:          text('color').notNull().default('#39ff14'),
  hourlyRate:     numeric('hourly_rate', { precision: 10, scale: 2 }),
  estimatedHours: numeric('estimated_hours', { precision: 10, scale: 2 }),
  billable:       boolean('billable').notNull().default(true),
  active:         boolean('active').notNull().default(true),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  billable:  boolean('billable').notNull().default(true),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const timeEntries = pgTable('time_entries', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId:      uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  description: text('description').notNull().default(''),
  date:        date('date').notNull(),
  startTime:   time('start_time'),
  endTime:     time('end_time'),
  durationMin: integer('duration_min').notNull(),
  billable:    boolean('billable').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export const pdfExports = pgTable('pdf_exports', {
  id:        uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  month:     date('month').notNull(),
  filename:  text('filename').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
