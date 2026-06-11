import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { cabinetSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.redirect(new URL('/login', APP_URL));
  }

  const sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, session.cabinetId)).limit(1))[0];
  if (!sub?.stripeCustomerId) {
    return NextResponse.redirect(new URL('/dashboard/account?no_stripe_customer=1', APP_URL));
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}/dashboard/account`,
  });

  return NextResponse.redirect(portal.url);
}
