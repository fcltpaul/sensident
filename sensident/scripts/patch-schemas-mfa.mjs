// Patch idempotent : ajoute mfa_email_codes dans les schemas PG et SQLite
import { readFileSync, writeFileSync } from 'node:fs';

const PG_PATH = 'src/db/schema.pg.ts';
const SQLITE_PATH = 'src/db/schema.sqlite.ts';

const pgMarker = `// CABINET LIBRARY ARTICLES (liaison cabinet -> article)`;
const sqliteMarker = `// CABINET LIBRARY ARTICLES (liaison cabinet -> article)`;

const pgBlock = `// ============================================
// MFA EMAIL CODES (codes a 6 chiffres envoyes par email)
// ============================================
// Alternative au TOTP pour les praticiens qui ne veulent pas
// installer Google Authenticator. Le code est a usage unique,
// expire en 10 min, et est stocke en hash SHA-256.
export const mfaEmailCodes = pgTable(
  'mfa_email_codes',
  {
    id: text('id').primaryKey(),
    practitionerId: text('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    practitionerIdx: index('mfa_email_codes_practitioner_idx').on(t.practitionerId, t.createdAt),
  })
);

`;

const sqliteBlock = `// ============================================
// MFA EMAIL CODES (codes a 6 chiffres envoyes par email)
// ============================================
export const mfaEmailCodes = sqliteTable(
  'mfa_email_codes',
  {
    id: text('id').primaryKey(),
    practitionerId: text('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql\`(unixepoch())\`),
  },
  (t) => ({
    practitionerIdx: index('mfa_email_codes_practitioner_idx').on(t.practitionerId, t.createdAt),
  })
);

`;

for (const [path, marker, block] of [
  [PG_PATH, pgMarker, pgBlock],
  [SQLITE_PATH, sqliteMarker, sqliteBlock],
]) {
  const c = readFileSync(path, 'utf-8');
  if (c.includes('mfaEmailCodes')) {
    console.log(`[skip] ${path}: already has mfaEmailCodes`);
    continue;
  }
  if (!c.includes(marker)) {
    console.error(`[err] ${path}: marker not found`);
    process.exit(1);
  }
  const updated = c.replace(marker, block + marker);
  writeFileSync(path, updated, 'utf-8');
  console.log(`[ok] ${path}: added mfaEmailCodes`);
}
