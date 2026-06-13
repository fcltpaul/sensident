'use client';

import { useState } from 'react';
import { Copy, Check, Mail, ChevronDown } from 'lucide-react';

const MESSAGE_COURT = `Bonjour Dr [Nom],

J'ai découvert Sensident, un service qui permet aux dentistes d'envoyer chaque mois à leurs patients un article de prévention validé scientifiquement, en 5 slides lisibles en 30 secondes. C'est gratuit pour les patients et c'est rapide à mettre en place (2 min).

Je pense que ça pourrait vous intéresser et que vos patients adoreraient. Le site : sensident.fr

Merci !
[Prénom]`;

const MESSAGE_MAIL = `Objet : Un service de prévention dentaire qui pourrait vous intéresser

Bonjour Dr [Nom],

J'ai découvert un service qui s'appelle Sensident et j'ai pensé à vous : c'est une plateforme qui permet aux dentistes d'envoyer chaque mois à leurs patients un article de prévention bucco-dentaire, validé scientifiquement, dans un format court (5 slides, 30 secondes de lecture). Tout est prêt, vous n'avez qu'à choisir un article et cliquer sur "Envoyer".

Quelques points qui m'ont convaincu :
- Les articles sont rédigés et validés par un comité scientifique de chirurgiens-dentistes
- Le patient reçoit un message signé de son dentiste, pas d'une marque
- Aucune liste patient à gérer : le patient s'inscrit via un QR code au fauteuil ou un lien
- Le dentiste voit des agrégats anonymisés (taux de lecture, réactions), pas les données nominatives
- C'est conforme HDS, RGPD, sans IA, hébergé en France
- C'est gratuit pour le patient, et 6 mois offerts pour les praticiens ambassadeurs

Je pense sincèrement que vos patients apprécieraient. Vous pouvez jeter un œil ici : https://sensident.fr

Bonne journée,
[Votre prénom]`;

export function ConvaincreMonDentiste() {
  const [openMail, setOpenMail] = useState(false);
  const [copied, setCopied] = useState<'short' | 'long' | null>(null);

  function copy(text: string, kind: 'short' | 'long') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Vous voulez convaincre votre dentiste&nbsp;?
        </h2>
        <p className="mt-3 text-muted-foreground text-base leading-relaxed">
          Copiez le message ci-dessous et envoyez-le-lui par email, SMS ou à l&apos;accueil
          de votre prochain rendez-vous. Le service est gratuit pour vous, et son inscription
          ne prend que 2 minutes.
        </p>
      </div>

      {/* Message court (par défaut) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <p className="font-medium text-sm">📋 Message court — pour SMS ou en cabinet</p>
          <button
            onClick={() => copy(MESSAGE_COURT, 'short')}
            className="inline-flex items-center gap-1.5 rounded-md bg-background border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
          >
            {copied === 'short' ? (
              <><Check className="h-3.5 w-3.5 text-green-600" /> Copié</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copier</>
            )}
          </button>
        </div>
        <div className="p-5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono text-[13px]">
{MESSAGE_COURT}
        </div>
      </div>

      {/* Message long (repliable) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setOpenMail(!openMail)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition text-left"
        >
          <p className="font-medium text-sm">📧 Email complet — avec les arguments qui marchent</p>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${openMail ? 'rotate-180' : ''}`} />
        </button>
        {openMail && (
          <div className="p-5 border-t border-border">
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={() => copy(MESSAGE_MAIL, 'long')}
                className="inline-flex items-center gap-1.5 rounded-md bg-background border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
              >
                {copied === 'long' ? (
                  <><Check className="h-3.5 w-3.5 text-green-600" /> Copié</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copier</>
                )}
              </button>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono text-[13px]">
{MESSAGE_MAIL}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-dashed border-border bg-background p-5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-2">💡 Ce qui marche le mieux&nbsp;:</p>
        <ul className="space-y-1.5">
          <li>• <strong>Parlez-en au cabinet</strong> à votre prochain rendez-vous — la réceptionniste est souvent la première à faire remonter l&apos;info.</li>
          <li>• <strong>Envoyez le mail depuis votre adresse</strong>, pas en SMS, pour qu&apos;il puisse cliquer sur le lien.</li>
          <li>• <strong>Personnalisez le message</strong> avec un exemple concret (ex&nbsp;: «&nbsp;j&apos;aimerais recevoir ce genre de contenu de votre part&nbsp;»).</li>
        </ul>
      </div>
    </div>
  );
}
