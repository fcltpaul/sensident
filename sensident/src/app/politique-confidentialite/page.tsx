export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Sensident</a>
          <h1 className="mt-2 text-3xl font-bold">Politique de confidentialité</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 8 juin 2026</p>
        </div>

        <Section title="1. Qui sommes-nous ?">
          <p>
            Sensident est une plateforme opérée par Paul Foucault, en cours d'immatriculation.
            Contact DPO : <a href="mailto:dpo@sensident.fr" className="text-accent underline">dpo@sensident.fr</a>
          </p>
        </Section>

        <Section title="2. Quelles données collectons-nous ?">
          <ul className="ml-6 list-disc space-y-1">
            <li>Email (obligatoire pour l'inscription)</li>
            <li>Adresse IP (à l'inscription, pour preuve de consentement)</li>
            <li>User agent (même finalité)</li>
            <li>Cabinet de votre dentiste (qui vous invite)</li>
            <li>Données d'usage des articles lus (anonymisées côté dentiste)</li>
            <li>Adresse email du dentiste + mot de passe hashé (côté praticien)</li>
          </ul>
          <p className="mt-2">
            <strong>Aucune donnée de santé au sens strict du RGPD art. 9 §1 n'est collectée.</strong>
            L'association entre votre identité et votre dentiste constitue une donnée de santé
            par déduction (considérant 51 RGPD), traitée avec les précautions HDS équivalentes.
          </p>
        </Section>

        <Section title="3. Pourquoi traitons-nous ces données ? (finalités)">
          <ul className="ml-6 list-disc space-y-1">
            <li>Envoi de newsletters de prévention bucco-dentaire (consentement explicite art. 6.1.a + art. 9.2.a)</li>
            <li>Authentification de votre dentiste (exécution contractuelle art. 6.1.b)</li>
            <li>Production de statistiques d'usage agrégées (intérêt légitime art. 6.1.f, avec anonymisation)</li>
            <li>Sécurité et prévention de la fraude (intérêt légitime)</li>
            <li>Respect de nos obligations légales (art. 6.1.c : conservation des preuves de consentement)</li>
          </ul>
        </Section>

        <Section title="4. Combien de temps conservons-nous vos données ?">
          <ul className="ml-6 list-disc space-y-1">
            <li>Email + consentement : 3 ans après votre désabonnement (recommandation CNIL B2C)</li>
            <li>Logs d'accès (audit) : 1 an</li>
            <li>Cookies de session : 7 jours (ou 24h pour magic link patient)</li>
          </ul>
        </Section>

        <Section title="5. Où sont stockées vos données ?">
          <p>
            <strong>100% en France</strong>, sur infrastructure certifiée HDS (Hébergeur de Données de Santé)
            conforme à l'art. L.1111-8 du Code de la santé publique. Le nom de l'hébergeur sera
            communiqué sur demande à <a href="mailto:dpo@sensident.fr" className="text-accent underline">dpo@sensident.fr</a>.
          </p>
        </Section>

        <Section title="6. Qui a accès à vos données ?">
          <ul className="ml-6 list-disc space-y-1">
            <li>Votre dentiste : <strong>aucun accès nominatif</strong>. Il voit uniquement des agrégats anonymisés (nombre de patients actifs, taux d'ouverture, top articles lus).</li>
            <li>Paul Foucault (équipe Sensident) : accès aux données techniques nécessaires à l'exploitation, sous engagement de confidentialité.</li>
            <li>Sous-traitants techniques : hébergeur HDS, prestataire email (Brevo), Stripe (facturation cabinet, pas d'accès aux données patient).</li>
            <li>Aucun transfert hors UE. Aucune IA tierce (OpenAI, Anthropic, etc.) ne traite vos données.</li>
          </ul>
        </Section>

        <Section title="7. Quels sont vos droits ?">
          <p>Conformément au RGPD, vous disposez à tout moment des droits suivants :</p>
          <ul className="ml-6 list-disc space-y-1">
            <li><strong>Droit d'accès</strong> (art. 15) : savoir quelles données nous avons sur vous</li>
            <li><strong>Droit de rectification</strong> (art. 16) : corriger des données inexactes</li>
            <li><strong>Droit à l'effacement</strong> (art. 17) : supprimer vos données</li>
            <li><strong>Droit à la limitation</strong> (art. 18) : geler temporairement le traitement</li>
            <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format ouvert</li>
            <li><strong>Droit d'opposition</strong> (art. 21) : vous opposer au traitement</li>
            <li><strong>Droit de réclamation</strong> auprès de la CNIL : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener" className="text-accent underline">cnil.fr</a></li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits : <a href="mailto:dpo@sensident.fr" className="text-accent underline">dpo@sensident.fr</a>
          </p>
        </Section>

        <Section title="8. Cookies et traceurs">
          <p>
            Sensident n'utilise <strong>aucun cookie tiers</strong> (pas de Google Analytics, Facebook Pixel, etc.).
            Seuls des cookies techniques first-party sont utilisés :
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Cookie de session praticien/admin (httpOnly, Secure, SameSite=Lax)</li>
            <li>Cookie de session patient (magic link, durée 24h)</li>
            <li>Service Worker pour la PWA (cache local des assets statiques)</li>
          </ul>
          <p className="mt-2">
            Conformément à l'exception des LIP (Lecture Impliquée de Page) de la CNIL, ces traceurs
            sont exemptés de consentement préalable car strictement nécessaires au service.
          </p>
        </Section>

        <Section title="9. Intelligence artificielle">
          <p>
            <strong>Sensident n'utilise aucune intelligence artificielle au runtime.</strong> Aucun LLM,
            aucun embedding, aucun algorithme de machine learning. Tous les traitements sont déterministes
            et auditables. Vos données ne sont envoyées à aucune IA tierce (OpenAI, Anthropic, Mistral, etc.).
          </p>
        </Section>

        <Section title="10. Modifications de cette politique">
          <p>
            Nous nous engageons à vous informer de toute modification substantielle par email.
            La version actuelle est toujours consultable à cette adresse.
          </p>
        </Section>

        <Section title="11. Contact DPO">
          <p>
            Pour toute question relative à vos données personnelles :<br />
            <a href="mailto:dpo@sensident.fr" className="text-accent underline">dpo@sensident.fr</a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6 space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}
