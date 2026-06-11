/**
 * Sensident — Schema SQLite (dev local, miroir du schema Postgres pour la prod)
 *
 * Ce fichier est utilisé uniquement en dev par `db/client.ts` quand DATABASE_URL
 * ne commence pas par `postgres://`. En prod on utilise le schema Postgres.
 *
 * Toute table du schema Postgres doit avoir son miroir SQLite ici.
 */
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// CABINETS
// ============================================
export const cabinets = sqliteTable('cabinets', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  contactEmail: text('contact_email'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  newsletterBranding: text('newsletter_branding').default('{"showLogo":false}'),
});

// ============================================
// ADMINS
// ============================================
export const admins = sqliteTable('admins', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: integer('totp_enabled', { mode: 'boolean' }).notNull().default(false),
  role: text('role', { enum: ['superadmin', 'editor', 'reader'] }).notNull().default('reader'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

// ============================================
// PRACTITIONERS
// ============================================
export const practitioners = sqliteTable('practitioners', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: integer('totp_enabled', { mode: 'boolean' }).notNull().default(false),
  role: text('role', { enum: ['owner', 'associate', 'assistant'] }).notNull().default('associate'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

// ============================================
// PRACTITIONER SESSIONS
// ============================================
export const practitionerSessions = sqliteTable('practitioner_sessions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  practitionerId: text('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  mfaVerified: integer('mfa_verified', { mode: 'boolean' }).notNull().default(false),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// ADMIN SESSIONS
// ============================================
export const adminSessions = sqliteTable('admin_sessions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  mfaVerified: integer('mfa_verified', { mode: 'boolean' }).notNull().default(false),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// INVITE TOKENS
// ============================================
export const inviteTokens = sqliteTable('invite_tokens', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  maxUses: integer('max_uses').notNull().default(1000),
  usedCount: integer('used_count').notNull().default(0),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// PATIENT CONSENTS
// ============================================
export const patientConsents = sqliteTable('patient_consents', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  emailHash: text('email_hash').notNull(),
  emailEncrypted: text('email_encrypted'),
  optInVersion: text('opt_in_version').notNull(),
  cguAccepted: integer('cgu_accepted', { mode: 'boolean' }).notNull(),
  newsletterOptin: integer('newsletter_optin', { mode: 'boolean' }).notNull().default(false),
  ip: text('ip'),
  userAgent: text('user_agent'),
  inviteTokenId: text('invite_token_id').references(() => inviteTokens.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
});

// ============================================
// PATIENT MAGIC LINKS
// ============================================
export const patientMagicLinks = sqliteTable('patient_magic_links', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  emailHash: text('email_hash').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// CATEGORIES
// ============================================
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id'),
  icon: text('icon'),
  color: text('color'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// ARTICLES
// ============================================
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  category: text('category').notNull(),
  bodyMd: text('body_md').notNull(),
  slidesJson: text('slides_json', { mode: 'json' }).$type<ArticleSlides>().notNull(),
  readingTimeMin: integer('reading_time_min').notNull(),
  status: text('status', { enum: ['draft', 'validated', 'archived'] }).notNull().default('draft'),
  validatedBy: text('validated_by'),
  validatedAt: integer('validated_at', { mode: 'timestamp' }),
  nextReviewAt: integer('next_review_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type ArticleSlides = Array<{
  title: string;
  body: string;
  visual?: string;
  takeaway?: string;
}>;

// ============================================
// ARTICLE <-> CATEGORIES (many-to-many)
// ============================================
export const articleCategories = sqliteTable(
  'article_categories',
  {
    articleSlug: text('article_slug').notNull(),
    categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: uniqueIndex('pk_article_categories').on(t.articleSlug, t.categoryId),
  })
);

// ============================================
// READING SESSIONS
// ============================================
export const readingSessions = sqliteTable('reading_sessions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  patientEmailHash: text('patient_email_hash').notNull(),
  articleSlug: text('article_slug').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastHeartbeatAt: integer('last_heartbeat_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
});

// ============================================
// ARTICLE HEARTBEATS
// ============================================
export const articleHeartbeats = sqliteTable(
  'article_heartbeats',
  {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    sessionId: text('session_id').notNull().references(() => readingSessions.id, { onDelete: 'cascade' }),
    ts: integer('ts', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    scrollPct: integer('scroll_pct').notNull().default(0),
  },
  (t) => ({
    sessionTsIdx: index('article_heartbeats_session_ts_idx').on(t.sessionId, t.ts),
  })
);

// ============================================
// NEWSLETTER TEMPLATES
// ============================================
export const newsletterTemplates = sqliteTable('newsletter_templates', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  previewImageUrl: text('preview_image_url'),
  reactEmailPath: text('react_email_path').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// NEWSLETTER SENDS
// ============================================
export const newsletterSends = sqliteTable('newsletter_sends', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => newsletterTemplates.id, { onDelete: 'set null' }),
  articleSlug: text('article_slug'),
  subject: text('subject').notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] }).notNull().default('draft'),
  totalRecipients: integer('total_recipients').notNull().default(0),
  practitionerName: text('practitioner_name'),
  cabinetName: text('cabinet_name'),
  customMessage: text('custom_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdBy: text('created_by'),
});

// ============================================
// NEWSLETTER RECIPIENTS
// ============================================
export const newsletterRecipients = sqliteTable('newsletter_recipients', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  sendId: text('send_id').notNull().references(() => newsletterSends.id, { onDelete: 'cascade' }),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  patientEmailHash: text('patient_email_hash').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed', 'erased'] }).notNull().default('pending'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  clickedAt: integer('clicked_at', { mode: 'timestamp' }),
  unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
});

// ============================================
// CABINET SUBSCRIPTIONS
// ============================================
export const cabinetSubscriptions = sqliteTable('cabinet_subscriptions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  cabinetId: text('cabinet_id').notNull().unique().references(() => cabinets.id, { onDelete: 'cascade' }),
  plan: text('plan', { enum: ['free', 'pro', 'cabinet'] }).notNull().default('free'),
  status: text('status', { enum: ['active', 'past_due', 'canceled', 'incomplete'] }).notNull().default('active'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// AUDIT LOGS
// ============================================
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  ts: integer('ts', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  actorType: text('actor_type', { enum: ['practitioner', 'patient', 'system', 'admin'] }).notNull(),
  actorId: text('actor_id'),
  cabinetId: text('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

// ============================================
// RATE LIMITS
// ============================================
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    route: text('route').notNull(),
    key: text('key').notNull(),
    ip: text('ip'),
    ts: integer('ts', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    routeKeyTsIdx: index('rate_limits_route_key_ts_idx').on(t.route, t.key, t.ts),
    tsIdx: index('rate_limits_ts_idx').on(t.ts),
  })
);

// ============================================
// CABINET LIBRARY ARTICLES (liaison cabinet -> article)
// ============================================
export const cabinetLibraryArticles = sqliteTable('cabinet_library_articles', {
  id: text('id').primaryKey(),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  articleId: text('article_id').notNull().references(() => articles.slug, { onDelete: 'cascade' }),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(false),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  pinOrder: integer('pin_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  uniqueLibrary: uniqueIndex('idx_library_unique').on(t.cabinetId, t.articleId),
}));

// ============================================
// PATIENT REACTIONS (👍 / 👎)
// ============================================
export const patientReactions = sqliteTable('patient_reactions', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.slug, { onDelete: 'cascade' }),
  cabinetId: text('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  patientEmailHash: text('patient_email_hash').notNull(),
  reaction: text('reaction').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  uniqueReaction: uniqueIndex('idx_reactions_unique').on(t.articleId, t.cabinetId, t.patientEmailHash),
  reactionArticleCabinetIdx: index('idx_reactions_article_cabinet').on(t.articleId, t.cabinetId),
}));

// Type exports (PG-compatible)
export type Cabinet = typeof cabinets.$inferSelect;
export type NewCabinet = typeof cabinets.$inferInsert;
export type Practitioner = typeof practitioners.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type NewsletterSend = typeof newsletterSends.$inferSelect;
export type NewsletterTemplate = typeof newsletterTemplates.$inferSelect;
export type PatientConsent = typeof patientConsents.$inferSelect;
export type CabinetLibraryArticle = typeof cabinetLibraryArticles.$inferSelect;
export type PatientReaction = typeof patientReactions.$inferSelect;
