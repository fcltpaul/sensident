export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Mentions légales</h1>
      <p className="text-muted-foreground">
        Dernière mise à jour : 11 juin 2026
      </p>
      <p>
        Conformément aux dispositions de l&apos;article 6.III de la loi n° 2004-575 du 21 juin 2004 pour la
        confiance dans l&apos;économie numérique (LCEN) et de l&apos;article 19 de la loi n° 2004-801 du 6 août
        2004, les informations suivantes sont portées à la connaissance des utilisateurs de la plateforme Sensident.
      </p>

      {/* ===== 1. ÉDITEUR ===== */}
      <section>
        <h2 className="text-2xl font-semibold">1. Éditeur de la Plateforme</h2>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>Dénomination</strong> : Sensident</p>
          <p><strong>Forme juridique</strong> : Entrepreneur individuel ou SAS en cours d&apos;immatriculation</p>
          <p><strong>Nom du responsable</strong> : Paul Foucault</p>
          <p><strong>Adresse</strong> : à communiquer lors de l&apos;immatriculation</p>
          <p><strong>Email</strong> : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></p>
          <p><strong>Téléphone</strong> : à communiquer</p>
          <p><strong>Numéro SIREN</strong> : en cours d&apos;attribution par l&apos;INSEE</p>
          <p><strong>Numéro SIRET</strong> : en cours d&apos;attribution par l&apos;INSEE</p>
          <p><strong>Code APE</strong> : en cours d&apos;attribution par l&apos;INSEE</p>
          <p><strong>Numéro de TVA intracommunautaire</strong> : en cours d&apos;attribution</p>
        </div>
        <p className="mt-2">
          Les informations d&apos;immatriculation seront mises à jour dès leur attribution. L&apos;absence
          temporaire de ces informations ne remet pas en cause la validité des présentes mentions légales.
        </p>
      </section>

      {/* ===== 2. DIRECTEUR DE PUBLICATION ===== */}
      <section>
        <h2 className="text-2xl font-semibold">2. Directeur de la publication</h2>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>Nom</strong> : Paul Foucault</p>
          <p><strong>Qualité</strong> : Fondateur et dirigeant de Sensident</p>
          <p><strong>Email</strong> : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></p>
        </div>
        <p className="mt-4">
          Conformément à l&apos;article 6.III alinéa 2 de la LCEN, le directeur de la publication est
          responsable du contenu éditorial mis en ligne sur la Plateforme, dans les conditions prévues
          par la loi.
        </p>
      </section>

      {/* ===== 3. HÉBERGEUR ===== */}
      <section>
        <h2 className="text-2xl font-semibold">3. Hébergeur</h2>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>Hébergeur</strong> : Hébergeur certifié HDS, France — nom à confirmer</p>
          <p><strong>Statut HDS</strong> : certification Hébergement des Données de Santé (en cours de migration)</p>
          <p><strong>Localisation</strong> : France</p>
        </div>
        <p className="mt-2">
          La Plateforme est actuellement hébergée sur Neon (AWS Europe Central, Francfort, Allemagne). Une
          migration vers un hébergeur certifié HDS (Hébergement des Données de Santé) situé en France est en
          cours, conformément aux articles L.1111-8 et R.1111-9 et suivants du Code de la santé publique.
          Les informations de l&apos;hébergeur seront mises à jour dès la finalisation de la migration.
        </p>
        <p>
          Conformément à l&apos;article 6.I.2 de la LCEN, l&apos;hébergeur a l&apos;obligation de conserver les
          données de nature à permettre l&apos;identification de toute personne ayant contribué à la création
          d&apos;un contenu, et de mettre en place un dispositif de signalement des contenus manifestement
          illicites.
        </p>
      </section>

      {/* ===== 4. PROPRIÉTÉ INTELLECTUELLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">4. Propriété intellectuelle</h2>

        <h3 className="text-xl font-medium mt-4">4.1 Plateforme</h3>
        <p>
          L&apos;ensemble des éléments constituant la Plateforme Sensident (structure générale, code source,
          charte graphique, logos, marques, textes, images, icônes, sons, vidéos, base de données, nom de
          domaine) est la propriété exclusive de Sensident ou fait l&apos;objet d&apos;une licence d&apos;usage.
          Ces éléments sont protégés par les dispositions du Code de la propriété intellectuelle (articles
          L.111-1 et suivants, L.112-1 et suivants, L.122-1 et suivants).
        </p>
        <p>
          Toute reproduction, représentation, modification, adaptation, extraction, diffusion, traduction,
          commercialisation, totale ou partielle, par quelque procédé que ce soit et sur quelque support que
          ce soit, est strictement interdite sans l&apos;autorisation préalable et écrite de Sensident,
          sous peine de poursuites judiciaires.
        </p>

        <h3 className="text-xl font-medium mt-4">4.2 Marques</h3>
        <p>
          La dénomination « Sensident », ainsi que les logos et signes distinctifs associés, sont des marques
          protégées appartenant à Sensident ou en cours d&apos;enregistrement, conformément aux articles
          L.711-1 et suivants du Code de la propriété intellectuelle. Toute utilisation non autorisée de ces
          marques est interdite.
        </p>

        <h3 className="text-xl font-medium mt-4">4.3 Contenus tiers</h3>
        <p>
          Les articles de prévention publiés par les Praticiens sont la propriété intellectuelle de leurs
          auteurs respectifs. Sensident bénéficie d&apos;une licence d&apos;usage aux fins exclusives de
          fonctionnement de la Plateforme. Toute réclamation relative à un contenu tiers peut être adressée
          à <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>.
        </p>

        <h3 className="text-xl font-medium mt-4">4.4 Base de données</h3>
        <p>
          La base de données de la Plateforme est protégée par les dispositions des articles L.341-1 et
          suivants du Code de la propriété intellectuelle relatifs au droit sui generis du producteur de
          base de données. Toute extraction ou réutilisation substantielle du contenu de la base de données
          est interdite sans autorisation.
        </p>
      </section>

      {/* ===== 5. DONNÉES PERSONNELLES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">5. Protection des données personnelles</h2>
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679)
          et à la loi n° 78-17 du 6 janvier 1978 modifiée, dite loi Informatique et Libertés, les modalités
          de collecte, de traitement et d&apos;exercice de vos droits relatifs à vos données personnelles
          sont détaillées dans notre
          <a href="/politique-confidentialite" className="underline text-primary"> Politique de confidentialité</a>.
        </p>
        <p>
          Vous disposez notamment d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          d&apos;opposition, de limitation et de portabilité de vos données. Pour exercer ces droits,
          contactez notre Délégué à la Protection des Données (DPO) :
        </p>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>DPO</strong> : Paul Foucault</p>
          <p><strong>Email</strong> : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></p>
        </div>
        <p className="mt-2">
          En cas de difficulté non résolue, vous pouvez introduire une réclamation auprès de la CNIL
          (3 Place de Fontenoy — TSA 80715, 75334 PARIS CEDEX 07 — www.cnil.fr), conformément à
          l&apos;article 77 du RGPD.
        </p>
      </section>

      {/* ===== 6. RESPONSABILITÉ ===== */}
      <section>
        <h2 className="text-2xl font-semibold">6. Responsabilité</h2>

        <h3 className="text-xl font-medium mt-4">6.1 Contenus éditoriaux</h3>
        <p>
          Les contenus éditoriaux publiés sur la Plateforme (articles de prévention) sont rédigés par les
          Praticiens abonnés, sous leur responsabilité exclusive. Sensident, en tant qu&apos;hébergeur au
          sens de l&apos;article 6.I.2 de la LCEN, n&apos;est pas tenu à une obligation générale de surveillance
          des contenus. Sa responsabilité ne peut être engagée du fait des contenus publiés par les Praticiens,
          sauf dans les conditions prévues aux articles 6.I.2 à 6.I.5 de la LCEN.
        </p>

        <h3 className="text-xl font-medium mt-4">6.2 Information médicale</h3>
        <p>
          Les informations diffusées sur la Plateforme constituent des contenus de prévention générale et ne
          sauraient se substituer à une consultation personnalisée chez un chirurgien-dentiste. En aucun cas
          la Plateforme ne délivre de diagnostic, de prescription médicale ou d&apos;avis médical personnalisé.
        </p>

        <h3 className="text-xl font-medium mt-4">6.3 Liens hypertextes</h3>
        <p>
          La Plateforme peut contenir des liens hypertextes vers des sites tiers. Sensident n&apos;exerce
          aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leur politique
          de confidentialité ou leurs pratiques. L&apos;activation de ces liens relève de la seule
          responsabilité de l&apos;utilisateur.
        </p>

        <h3 className="text-xl font-medium mt-4">6.4 Signalement de contenus illicites</h3>
        <p>
          Conformément à l&apos;article 6.I.5 de la LCEN, tout utilisateur peut signaler un contenu
          manifestement illicite en adressant une notification à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>.
          Cette notification doit contenir les éléments prévus par l&apos;article 6.I.5 de la LCEN (date,
          identité du notifiant, description des faits litigieux, localisation précise du contenu, motifs
          pour lesquels le contenu doit être retiré).
        </p>
      </section>

      {/* ===== 7. LITIGES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">7. Loi applicable et règlement des litiges</h2>

        <h3 className="text-xl font-medium mt-4">7.1 Droit applicable</h3>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, le droit français
          est exclusivement applicable.
        </p>

        <h3 className="text-xl font-medium mt-4">7.2 Médiation</h3>
        <p>
          Conformément aux articles L.611-1 à L.616-3 du Code de la consommation, l&apos;Utilisateur (consommateur)
          peut recourir gratuitement à un médiateur de la consommation en cas de litige non résolu avec Sensident.
          Les coordonnées du médiateur compétent seront précisées dès l&apos;immatriculation de la société.
        </p>

        <h3 className="text-xl font-medium mt-4">7.3 Compétence juridictionnelle</h3>
        <p>
          À défaut de résolution amiable, tout litige relatif à l&apos;utilisation de la Plateforme sera
          porté devant les tribunaux compétents du ressort de Nantes (France), nonobstant pluralité de
          défendeurs ou appel en garantie. L&apos;Utilisateur consommateur bénéficie également de la faculté
          de saisir la juridiction de son domicile, conformément aux règles de compétence du Code de procédure
          civile et au Règlement UE 1215/2012 (Bruxelles I bis).
        </p>

        <h3 className="text-xl font-medium mt-4">7.4 Plateforme de règlement en ligne des litiges</h3>
        <p>
          Conformément au Règlement UE 524/2013, la Commission européenne met à disposition une plateforme
          de règlement en ligne des litiges (RLL) accessible à l&apos;adresse suivante :
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline text-primary"> https://ec.europa.eu/consumers/odr/</a>.
        </p>
      </section>
    </main>
  );
}
