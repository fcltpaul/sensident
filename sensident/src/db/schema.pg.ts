/**
 * Sensident — Schéma Drizzle (TypeScript)
 *
 * Ce fichier miroir le schema.sql pour que Drizzle Kit puisse générer les migrations.
 * En prod, on applique le schema.sql en une fois puis Drizzle suit les deltas.
 */
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, inet, index, uniqueIndex, check, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// CABINETS
// ============================================
export const cabinets = pgTable('cabinets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  rpps: text('rpps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Bloc contact B2 flexible
  contactAddress: text('contact_address'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  contactRdvUrl: text('contact_rdv_url'),
  contactOpeningHours: jsonb('contact_opening_hours').$type<Record<string, string>>(),
  contactFacadePhotoUrl: text('contact_facade_photo_url'),
  contactOncdMention: boolean('contact_oncd_mention').notNull().default(false),
  contactMapUrl: text('contact_map_url'),
}, (t) => ({
  slugIdx: uniqueIndex('idx_cabinets_slug').on(t.slug),
}));

// ============================================
// PRACTITIONERS
// ============================================
export const practitioners = pgTable('practitioners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  role: text('role', { enum: ['owner', 'associate', 'assistant'] }).notNull().default('owner'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cabinetIdx: index('idx_practitioners_cabinet_id').on(t.cabinetId),
}));

export const practitionerSessions = pgTable('practitioner_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  mfaVerified: boolean('mfa_verified').notNull().default(false),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// ADMINS (Paul, Dr Thibault, etc.)
// ============================================
export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  role: text('role', { enum: ['superadmin', 'editor', 'reader'] }).notNull().default('reader'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// ADMIN SESSIONS (Paul, Dr Thibault, etc.)
// ============================================
export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  mfaVerified: boolean('mfa_verified').notNull().default(false),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// INVITE TOKENS
// ============================================
export const inviteTokens = pgTable('invite_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdBy: uuid('created_by').notNull().references(() => practitioners.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  maxUses: integer('max_uses').notNull().default(1000),
  usedCount: integer('used_count').notNull().default(0),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// ============================================
// PATIENT CONSENTS
// ============================================
export const patientConsents = pgTable('patient_consents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  emailHash: text('email_hash').notNull(),
  emailEncrypted: text('email_encrypted'),   // PGP-encrypted for newsletter sends
  optInVersion: text('opt_in_version').notNull(),
  cguAccepted: boolean('cgu_accepted').notNull(),
  newsletterOptin: boolean('newsletter_optin').notNull(),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  inviteTokenId: uuid('invite_token_id').references(() => inviteTokens.id, { onDelete: 'set null' }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEmailPerCabinet: uniqueIndex('uniq_patient_per_cabinet').on(t.cabinetId, t.emailHash),
}));

// ============================================
// MAGIC LINKS
// ============================================
export const patientMagicLinks = pgTable('patient_magic_links', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  emailHash: text('email_hash').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ip: inet('ip'),
});

// ============================================
// CATEGORIES (hierarchiques, 1 niveau de profondeur pour MVP)
// ============================================
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),  // null = racine
  icon: text('icon'),
  color: text('color'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// ARTICLES
// ============================================
export const articles = pgTable('articles', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  category: text('category').notNull(),
  bodyMd: text('body_md').notNull(),
  slidesJson: jsonb('slides_json').$type<ArticleSlides>().notNull(),
  readingTimeMin: integer('reading_time_min').notNull(),
  status: text('status', { enum: ['draft', 'validated', 'archived'] }).notNull().default('draft'),
  validatedBy: uuid('validated_by').references(() => practitioners.id),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ArticleSlides = Array<{
  title: string;
  body: string;
  visual?: string;     // Description du visuel (sera généré)
  takeaway?: string;   // 1 phrase à retenir
}>;

// ============================================
// READING SESSIONS
// ============================================
export const articleCategories = pgTable(
  'article_categories',
  {
    articleSlug: text('article_slug').notNull(),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: uniqueIndex('pk_article_categories').on(t.articleSlug, t.categoryId),
  })
);


export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  patientEmailHash: text('patient_email_hash').notNull(),
  articleSlug: text('article_slug').notNull().references(() => articles.slug, { onDelete: 'cascade' }),
  source: text('source', { enum: ['newsletter', 'direct', 'site'] }).notNull(),
  newsletterSendId: uuid('newsletter_send_id'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  maxScrollPct: integer('max_scroll_pct').notNull().default(0),
  maxSlideReached: integer('max_slide_reached'),
  completed: boolean('completed').notNull().default(false),
  clientUserAgent: text('client_user_agent'),
  clientViewport: text('client_viewport'),
});

// ============================================
// HEARTBEATS
// ============================================
export const articleHeartbeats = pgTable('article_heartbeats', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  readingSessionId: uuid('reading_session_id').notNull().references(() => readingSessions.id, { onDelete: 'cascade' }),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  scrollPct: integer('scroll_pct').notNull(),
  tabVisible: boolean('tab_visible').notNull().default(true),
  slideIndex: integer('slide_index'),
});

// ============================================
// NEWSLETTER TEMPLATES
// ============================================
export const newsletterTemplates = pgTable('newsletter_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  previewImageUrl: text('preview_image_url'),
  reactEmailPath: text('react_email_path').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// NEWSLETTER SENDS
// ============================================
export const newsletterSends = pgTable('newsletter_sends', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => newsletterTemplates.id),
  articleSlug: text('article_slug').notNull().references(() => articles.slug),
  subject: text('subject').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: text('status', { enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] }).notNull().default('draft'),
  totalRecipients: integer('total_recipients').notNull().default(0),
  createdBy: uuid('created_by').notNull().references(() => practitioners.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  practitionerName: text('practitioner_name'),
  cabinetName: text('cabinet_name'),
  customMessage: text('custom_message'),
});

// ============================================
// NEWSLETTER RECIPIENTS
// ============================================
export const newsletterRecipients = pgTable('newsletter_recipients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sendId: uuid('send_id').notNull().references(() => newsletterSends.id, { onDelete: 'cascade' }),
  cabinetId: uuid('cabinet_id').notNull().references(() => cabinets.id, { onDelete: 'cascade' }),
  patientEmailHash: text('patient_email_hash').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed', 'erased'] }).notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  brevoMessageId: text('brevo_message_id'),
});

// ============================================
// CABINET SUBSCRIPTIONS
// ============================================
export const cabinetSubscriptions = pgTable('cabinet_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: uuid('cabinet_id').notNull().unique().references(() => cabinets.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  plan: text('plan', { enum: ['free', 'pro', 'cabinet'] }).notNull().default('free'),
  status: text('status', { enum: ['active', 'past_due', 'canceled', 'incomplete'] }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  isAmbassador: boolean('is_ambassador').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// AUDIT LOGS
// ============================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  actorType: text('actor_type', { enum: ['practitioner', 'patient', 'system', 'admin'] }).notNull(),
  actorId: uuid('actor_id'),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
});

// ============================================
// RATE LIMITS (compteurs anti-brute-force, par IP+route)
// ============================================
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    route: text('route').notNull(),         // 'login_practitioner', 'patient_optin', etc.
    key: text('key').notNull(),             // 'ip' ou 'ip:email'
    ip: inet('ip'),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    routeKeyTsIdx: index('rate_limits_route_key_ts_idx').on(t.route, t.key, t.ts),
    tsIdx: index('rate_limits_ts_idx').on(t.ts),
  })
);

// Type exports
export type Cabinet = typeof cabinets.$inferSelect;
export type NewCabinet = typeof cabinets.$inferInsert;
export type Practitioner = typeof practitioners.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type NewsletterSend = typeof newsletterSends.$inferSelect;
export type NewsletterTemplate = typeof newsletterTemplates.$inferSelect;
export type PatientConsent = typeof patientConsents.$inferSelect;
