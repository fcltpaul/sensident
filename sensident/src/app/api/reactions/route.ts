import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { patientReactions, patientConsents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * POST /api/reactions
 * Upsert or delete a reaction on an article
 *
 * RGPD article 7 : on verifie consentReactions avant d'ecrire une reaction.
 * Si pas de consentement → 403 + message clair cote client (bouton desactive).
 */
export async function POST(request: NextRequest) {
  const { articleId, cabinetId, patientEmailHash, reaction } = await request.json();

  if (!articleId || !cabinetId || !patientEmailHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // RGPD : verifier que le patient a consenti aux reactions avant tout write
  const consentRow = await db
    .select({ consentReactions: patientConsents.consentReactions })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cabinetId),
        eq(patientConsents.emailHash, patientEmailHash),
      ),
    )
    .limit(1);

  // Si le patient n'existe pas (cas tres improbable : magic-link a expire)
  // ou s'il n'a pas coche la case reactions, on refuse en 403.
  const hasReactionsConsent = consentRow[0]?.consentReactions === true;
  if (!hasReactionsConsent) {
    return NextResponse.json(
      {
        error: 'Consentement reactions requis. Vous pouvez activer cette option dans votre espace patient.',
        code: 'consent_required',
        finalite: 'reactions',
      },
      { status: 403 },
    );
  }

  if (reaction === null) {
    // Delete reaction (toggle off)
    await db
      .delete(patientReactions)
      .where(
        and(
          eq(patientReactions.articleId, articleId),
          eq(patientReactions.cabinetId, cabinetId),
          eq(patientReactions.patientEmailHash, patientEmailHash)
        )
      );
  } else {
    // Upsert
    if (reaction !== 'up' && reaction !== 'down') {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    await db
      .insert(patientReactions)
      .values({
        articleId,
        cabinetId,
        patientEmailHash,
        reaction,
      })
      .onConflictDoUpdate({
        target: [
          patientReactions.articleId,
          patientReactions.cabinetId,
          patientReactions.patientEmailHash,
        ],
        set: { reaction },
      });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/reactions
 * Get reaction counts for an article in a cabinet
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');
  const cabinetId = searchParams.get('cabinetId');

  if (!articleId || !cabinetId) {
    return NextResponse.json({ error: 'articleId and cabinetId required' }, { status: 400 });
  }

  const [upCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(patientReactions)
    .where(
      and(
        eq(patientReactions.articleId, articleId),
        eq(patientReactions.cabinetId, cabinetId),
        eq(patientReactions.reaction, 'up')
      )
    );

  const [downCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(patientReactions)
    .where(
      and(
        eq(patientReactions.articleId, articleId),
        eq(patientReactions.cabinetId, cabinetId),
        eq(patientReactions.reaction, 'down')
      )
    );

  return NextResponse.json({
    up: Number(upCount?.count ?? 0),
    down: Number(downCount?.count ?? 0),
  });
}
