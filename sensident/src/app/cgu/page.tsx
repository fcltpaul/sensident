export default function CguPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <div>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Sensident</a>
          <h1 className="mt-2 text-3xl font-bold">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 8 juin 2026</p>
        </div>

        <Section title="1. Objet">
          <p>
            Les présentes CGU régissent l'utilisation de la plateforme Sensident, opérée par
            Paul Foucault. En vous inscrivant, vous acceptez ces CGU et notre
            <a href="/politique-confidentialite" className="text-accent underline"> Politique de confidentialité</a>.
          </p>
        </Section>

        <Section title="2. Description du service">
          <p>
            Sensident est une plateforme de newsletters de prévention bucco-dentaire. Elle permet
            à votre dentiste de vous envoyer, à votre demande, des articles d'éducation et de
            prévention. <strong>Sensident n'effectue aucun diagnostic médical et ne remplace pas une consultation.</strong>
          </p>
        </Section>

        <Section title="3. Inscription">
          <p>
            L'inscription requiert une adresse email valide. Vous devez être majeur ou disposer
            de l'accord de vos parents pour les mineurs. Vous vous engagez à fournir des informations exactes.
          </p>
        </Section>

        <Section title="4. Vos engagements">
          <ul className="ml-6 list-disc space-y-1">
            <li>Utiliser le service conformément à sa finalité (information de prévention).</li>
            <li>Ne pas usurper l'identité d'un tiers.</li>
            <li>Ne pas tenter de porter atteinte au service ou à ses utilisateurs.</li>
          </ul>
        </Section>

        <Section title="5. Désabonnement">
          <p>
            Vous pouvez vous désabonner à tout moment, depuis le lien prévu dans chaque email
            ou en contactant votre dentiste. Conformément au RGPD, vos données seront supprimées
            dans un délai de 30 jours (cf. <a href="/politique-confidentialite" className="text-accent underline">Politique de confidentialité</a>).
          </p>
        </Section>

        <Section title="6. Responsabilité">
          <p>
            Les informations de prévention diffusées sont validées par un comité scientifique composé
            de chirurgiens-dentistes diplômés. Elles ne constituent pas un avis médical personnalisé.
            En cas de doute, consultez votre dentiste ou un professionnel de santé.
          </p>
        </Section>

        <Section title="7. Évolution du service">
          <p>
            Sensident peut faire évoluer le service, ajouter ou supprimer des fonctionnalités.
            En cas de modification substantielle, les utilisateurs inscrits en seront informés par email.
          </p>
        </Section>

        <Section title="8. Données personnelles">
          <p>
            Le traitement de vos données personnelles est décrit dans notre
            <a href="/politique-confidentialite" className="text-accent underline"> Politique de confidentialité</a>.
            Aucune donnée de santé au sens strict n'est collectée, mais l'association cabinet-patient
            constitue une donnée de santé par déduction, traitée avec les précautions HDS.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Pour toute question : <a href="mailto:contact@sensident.fr" className="text-accent underline">contact@sensident.fr</a>
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
