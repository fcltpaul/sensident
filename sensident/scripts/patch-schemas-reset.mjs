// Patch : ajoute password_reset_tokens dans les schemas
import { readFileSync, writeFileSync } from 'node:fs';

const PG_PATH = 'src/db/schema.pg.ts';
const SQLITE_PATH = 'src/db/schema.sqlite.ts';

const pgBlock = `// ============================================
// PASSWORD RESET TOKENS
// ============================================
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    practitionerId: text('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    practitionerIdx: index('password_reset_tokens_practitioner_idx').on(t.practitionerId, t.createdAt),
  })
);

`;

const sqliteBlock = `// ============================================
// PASSWORD RESET TOKENS
// ============================================
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    practitionerId: text('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql\`(unixepoch())\`),
  },
  (t) => ({
    practitionerIdx: index('password_reset_tokens_practitioner_idx').on(t.practitionerId, t.createdAt),
  })
);

`;

const marker = `// MFA EMAIL CODES`;

for (const [path, block] of [[PG_PATH, pgBlock], [SQLITE_PATH, sqliteBlock]]) {
  const c = readFileSync(path, 'utf-8');
  if (c.includes('passwordResetTokens')) {
    console.log(`[skip] ${path}: already has passwordResetTokens`);
    continue;
  }
  if (!c.includes(marker)) {
    console.error(`[err] ${path}: marker not found`);
    process.exit(1);
  }
  const updated = c.replace(marker, block + marker);
  writeFileSync(path, updated, 'utf-8');
  console.log(`[ok] ${path}: added passwordResetTokens`);
}
