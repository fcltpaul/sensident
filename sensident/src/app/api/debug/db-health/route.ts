import { NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { sql } from 'drizzle-orm';

/**
 * Endpoint TEMPORAIRE de diagnostic.
 * NE PAS laisser en prod : expose des infos sur la BDD.
 * À supprimer une fois le problème identifié.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const info: any = {
    dialect: DB_DIALECT,
    nodeEnv: process.env.NODE_ENV,
    databaseUrlHost: (process.env.DATABASE_URL || '').replace(/:\/\/[^@]*@/, '://***@').split('/')[2] || 'unset',
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasCronSecret: !!process.env.CRON_SECRET,
    hasUnsubscribeSecret: !!process.env.UNSUBSCRIBE_SECRET,
    hasIpHashSalt: !!process.env.IP_HASH_SALT,
    hasCabinetHashSalt: !!process.env.CABINET_HASH_SALT,
    hasBrevoUser: !!process.env.BREVO_SMTP_USER,
    hasBrevoPass: !!process.env.BREVO_SMTP_PASS,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasStripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasEmailFrom: !!process.env.EMAIL_FROM,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    timestamp: new Date().toISOString(),
  };

  // Test connexion BDD
  try {
    if (DB_DIALECT === 'postgresql') {
      const r = await rawSqlClient`SELECT 1 as ok, current_database() as db, version() as v`;
      info.db = { ok: true, db: r[0]?.db, version: (r[0]?.v || '').substring(0, 80) };
    } else {
      const r = await db.all(sql`SELECT 1 as ok`);
      info.db = { ok: true, result: r };
    }
  } catch (e: any) {
    info.db = { ok: false, error: String(e?.message || e).substring(0, 500) };
  }

  // Test count practitioners
  try {
    if (DB_DIALECT === 'postgresql') {
      const r = await rawSqlClient`SELECT COUNT(*)::int as n FROM practitioners`;
      info.practitioners = r[0]?.n ?? 0;
    }
  } catch (e: any) {
    info.practitionersError = String(e?.message || e).substring(0, 300);
  }

  // Test count cabinets
  try {
    if (DB_DIALECT === 'postgresql') {
      const r = await rawSqlClient`SELECT COUNT(*)::int as n FROM cabinets`;
      info.cabinets = r[0]?.n ?? 0;
    }
  } catch (e: any) {
    info.cabinetsError = String(e?.message || e).substring(0, 300);
  }

  return NextResponse.json(info);
}
