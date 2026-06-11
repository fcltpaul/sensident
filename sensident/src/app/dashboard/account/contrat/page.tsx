export default function ContratPraticienPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Contrat d&apos;abonnement et d&apos;utilisation de la Plateforme Sensident</h1>
      <p className="text-muted-foreground">
        Version 1.0 — Dernière mise à jour : 11 juin 2026
      </p>
      <p>
        <strong>Entre les soussignés :</strong>
      </p>
      <div className="bg-muted/30 rounded-lg p-4 space-y-1">
        <p>
          <strong>Sensident</strong>, ci-après dénommé le « Prestataire », représenté par Paul Foucault,
          entrepreneur individuel ou SAS en cours d&apos;immatriculation, dont le siège social sera communiqué
          lors de l&apos;immatriculation, email : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>,
        </p>
        <p className="mt-2"><strong>ET</strong></p>
        <p className="mt-2">
          Le <strong>chirurgien-dentiste ou cabinet dentaire</strong>, ci-après dénommé le « Praticien »,
          personne physique ou morale dûment inscrite à l&apos;Ordre national des chirurgiens-dentistes,
          ayant souscrit à l&apos;abonnement Sensident via Stripe et accepté les présentes conditions
          générales de contrat.
        </p>
      </div>
      <p className="mt-2">
        Ci-après dénommés individuellement la « Partie » et collectivement les « Parties ».
      </p>
      <p><strong>IL A ÉTÉ CONVENU CE QUI SUIT :</strong></p>

      {/* ===== 1. OBJET ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 1 — Objet du contrat</h2>
        <p>
          Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire met à
          disposition du Praticien la Plateforme Sensident, solution SaaS de prévention bucco-dentaire par
          newsletter, et les obligations réciproques des Parties dans le cadre de cette relation contractuelle.
        </p>
        <p>
          La Plateforme permet au Praticien :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>De publier des articles de prévention bucco-dentaire à destination de ses patients ;</li>
          <li>D&apos;inviter ses patients à s&apos;abonner via un token d&apos;invitation unique ;</li>
          <li>De diffuser des newsletters à ses patients abonnés ;</li>
          <li>De consulter des statistiques agrégées de lecture et de réactions ;</li>
          <li>De gérer ses abonnés et suivre l&apos;impact de sa communication préventive.</li>
        </ul>
        <p>
          Le présent contrat est conclu pour une durée indéterminée à compter de la souscription, sous réserve
          du paiement de l&apos;abonnement mensuel via Stripe et du respect des présentes conditions.
        </p>
      </section>

      {/* ===== 2. OBLIGATIONS DE SENSIDENT ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 2 — Obligations du Prestataire (Sensident)</h2>

        <h3 className="text-xl font-medium mt-4">2.1 Mise à disposition de la Plateforme</h3>
        <p>
          Le Prestataire s&apos;engage à fournir au Praticien un accès à la Plateforme Sensident via une
          interface web accessible en ligne, 24 heures sur 24 et 7 jours sur 7, sous réserve des opérations
          de maintenance programmée et des cas de force majeure. Le Prestataire met en œuvre les moyens
          nécessaires pour assurer une disponibilité minimale de 99,5 % par mois calendaire, calculée hors
          périodes de maintenance planifiée.
        </p>

        <h3 className="text-xl font-medium mt-4">2.2 Hébergement conforme HDS</h3>
        <p>
          Le Prestataire s&apos;engage à héberger les données de la Plateforme chez un hébergeur certifié
          HDS (Hébergement des Données de Santé) conformément aux articles L.1111-8 et R.1111-9 et suivants
          du Code de la santé publique. La migration vers un hébergeur certifié HDS situé en France est en
          cours. En phase transitoire, les données sont hébergées chez Neon (AWS Europe Central, Francfort,
          Allemagne) avec un niveau de sécurité conforme à l&apos;article 32 du RGPD.
        </p>
        <p>
          Le Prestataire garantit que l&apos;ensemble des données à caractère personnel est stocké et traité
          au sein de l&apos;Union européenne, conformément au chapitre V du RGPD. Le Prestataire informera
          le Praticien de la finalisation de la migration HDS dans un délai de 15 jours.
        </p>

        <h3 className="text-xl font-medium mt-4">2.3 Conformité RGPD</h3>
        <p>
          Le Prestataire s&apos;engage à traiter les données à caractère personnel conformément au Règlement
          Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi n° 78-17 du
          6 janvier 1978 modifiée. Il agit en qualité de sous-traitant au sens de l&apos;article 28 du RGPD
          pour le compte du Praticien, responsable de traitement. Les obligations détaillées relatives au
          traitement des données sont précisées à l&apos;article 5 du présent contrat et dans l&apos;Accord
          de Traitement des Données (DPA) figurant en Annexe 1.
        </p>

        <h3 className="text-xl font-medium mt-4">2.4 Support technique</h3>
        <p>
          Le Prestataire assure un support technique par email à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a> pendant
          les jours ouvrés (lundi au vendredi, 9h-18h CET), avec un engagement de première réponse sous
          48 heures ouvrées. Le support couvre les incidents techniques, les questions d&apos;utilisation
          et les demandes d&apos;assistance. Les interventions de maintenance programmée sont annoncées au
          moins 48 heures à l&apos;avance.
        </p>

        <h3 className="text-xl font-medium mt-4">2.5 Évolution du service</h3>
        <p>
          Le Prestataire se réserve le droit de faire évoluer la Plateforme pour en améliorer les
          fonctionnalités, la sécurité ou la conformité. Les évolutions substantielles sont communiquées
          au Praticien avec un préavis d&apos;au moins 30 jours. Les évolutions mineures (correctifs,
          améliorations d&apos;interface) peuvent être déployées sans préavis, dès lors qu&apos;elles
          n&apos;altèrent pas les fonctionnalités essentielles.
        </p>
      </section>

      {/* ===== 3. OBLIGATIONS DU PRATICIEN ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 3 — Obligations du Praticien</h2>

        <h3 className="text-xl font-medium mt-4">3.1 Usage conforme</h3>
        <p>
          Le Praticien s&apos;engage à utiliser la Plateforme conformément aux présentes conditions, aux
          lois et règlements en vigueur, et aux règles déontologiques applicables à la profession de
          chirurgien-dentiste, telles que prévues par le Code de la santé publique (articles R.4127-201
          et suivants) et le Code de déontologie des chirurgiens-dentistes.
        </p>

        <h3 className="text-xl font-medium mt-4">3.2 Contenus publiés</h3>
        <p>
          Le Praticien est seul responsable des contenus (articles, newsletters, textes, images) qu&apos;il
          publie via la Plateforme. Il garantit :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Que ces contenus sont conformes aux lois et règlements en vigueur, notamment le Code de la santé publique, et aux recommandations de l&apos;Ordre national des chirurgiens-dentistes ;</li>
          <li>Qu&apos;ils ne contiennent pas d&apos;informations médicales erronées, trompeuses ou non conformes aux données acquises de la science (articles R.4127-212 et R.4127-215 du Code de la santé publique) ;</li>
          <li>Qu&apos;ils ne portent pas atteinte aux droits de tiers (propriété intellectuelle, droit à l&apos;image, vie privée, diffamation) ;</li>
          <li>Qu&apos;ils respectent l&apos;interdiction de la publicité directe ou indirecte pour le cabinet dentaire, conformément à l&apos;article R.4127-215 du Code de la santé publique.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">3.3 Interdictions</h3>
        <p>Le Praticien s&apos;interdit formellement :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Revente</strong> : de revendre, concéder en licence, sous-licencier, louer ou transférer
            l&apos;accès à la Plateforme à un tiers non autorisé. L&apos;abonnement est nominatif et attaché
            au cabinet dentaire contractant.
          </li>
          <li>
            <strong>Usage IA non autorisé</strong> : de connecter la Plateforme à un système d&apos;intelligence
            artificielle, d&apos;apprentissage automatique ou de traitement automatisé externe sans autorisation
            préalable expresse du Prestataire. Le Praticien s&apos;engage à ne pas utiliser les données de la
            Plateforme pour entraîner, alimenter ou enrichir un modèle d&apos;IA, de quelque nature que ce soit.
          </li>
          <li>
            <strong>Ingénierie inverse</strong> : de décompiler, désassembler ou pratiquer l&apos;ingénierie
            inverse de la Plateforme, sauf dans les limites prévues par l&apos;article L.122-6-1 du Code de
            la propriété intellectuelle.
          </li>
          <li>
            <strong>Usage illicite</strong> : d&apos;utiliser la Plateforme à des fins illicites, frauduleuses,
            ou susceptibles de porter atteinte à la sécurité, à l&apos;intégrité ou à la disponibilité du service.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">3.4 Information des patients</h3>
        <p>
          Le Praticien s&apos;engage à informer ses patients de l&apos;existence de la Plateforme, des modalités
          d&apos;inscription (double opt-in, token d&apos;invitation), et de la nature des données collectées.
          Le Praticien s&apos;engage à respecter et à faire respecter le principe du double opt-in : il ne doit
          en aucun cas inscrire lui-même un patient, ni pré-remplir un formulaire d&apos;inscription, ni
          exercer de pression sur le patient pour obtenir son consentement.
        </p>
        <p>
          Le Praticien s&apos;engage à informer ses patients de leurs droits au titre du RGPD (accès,
          rectification, effacement, opposition, portabilité) et à les orienter vers la
          <a href="/politique-confidentialite" className="underline text-primary"> Politique de confidentialité</a> de Sensident.
        </p>

        <h3 className="text-xl font-medium mt-4">3.5 Sécurité du compte</h3>
        <p>
          Le Praticien est responsable de la confidentialité de ses identifiants de connexion et de l&apos;usage
          qui en est fait. Il s&apos;engage à informer immédiatement le Prestataire de toute utilisation non
          autorisée de son compte ou de toute violation de sécurité. Le Prestataire ne saurait être tenu
          responsable des dommages résultant d&apos;une utilisation non autorisée du compte du Praticien.
        </p>
      </section>

      {/* ===== 4. TRAITEMENT DES DONNÉES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 4 — Traitement des données à caractère personnel</h2>

        <h3 className="text-xl font-medium mt-4">4.1 Qualification des Parties</h3>
        <p>
          Au sens du RGPD (article 4.7 et 4.8) :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Le <strong>Praticien</strong> agit en qualité de <strong>responsable de traitement</strong> à
            l&apos;égard des données personnelles de ses patients collectées via la Plateforme. Il détermine
            les finalités (prévention bucco-dentaire, information des patients) et les moyens du traitement.
          </li>
          <li>
            Le <strong>Prestataire (Sensident)</strong> agit en qualité de <strong>sous-traitant</strong> au
            sens de l&apos;article 28 du RGPD. Il traite les données pour le compte du Praticien, conformément
            à ses instructions documentées.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">4.2 Instructions du responsable de traitement</h3>
        <p>
          Le Prestataire s&apos;engage à traiter les données personnelles exclusivement pour les finalités
          suivantes, conformément aux instructions documentées du Praticien (article 28.3.a du RGPD) :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Collecte et stockage des données d&apos;inscription (email, nom, token) ;</li>
          <li>Gestion du mécanisme de double opt-in ;</li>
          <li>Envoi des newsletters aux patients abonnés ;</li>
          <li>Collecte et stockage des données de heartbeat (lecture) et de réactions (👍👎) ;</li>
          <li>Production de statistiques agrégées à destination du Praticien (avec seuil minimum de 5 patients) ;</li>
          <li>Gestion des désabonnements et des droits des personnes concernées.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">4.3 Accord de Traitement des Données (DPA)</h3>
        <p>
          L&apos;Accord de Traitement des Données (DPA) figure en <strong>Annexe 1</strong> au présent contrat.
          Il précise notamment :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>L&apos;objet, la nature et la finalité du traitement (art. 28.3 RGPD) ;</li>
          <li>Les catégories de données et de personnes concernées ;</li>
          <li>Les mesures techniques et organisationnelles de sécurité (art. 32 RGPD) ;</li>
          <li>Les obligations du sous-traitant (art. 28.3 a à h RGPD) ;</li>
          <li>Le recours à des sous-traitants ultérieurs (art. 28.2 et 28.4 RGPD) ;</li>
          <li>La gestion des violations de données (art. 33 et 34 RGPD) ;</li>
          <li>Le sort des données en fin de contrat (art. 28.3.g RGPD).</li>
        </ul>
        <p>
          En signant le présent contrat, le Praticien reconnaît avoir pris connaissance et accepter les termes
          du DPA.
        </p>

        <h3 className="text-xl font-medium mt-4">4.4 Sous-traitants ultérieurs</h3>
        <p>
          Le Prestataire informe le Praticien du recours aux sous-traitants ultérieurs suivants :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Brevo</strong> (envoi d&apos;emails transactionnels et campagnes) — Allemagne ;</li>
          <li><strong>Hébergeur HDS</strong> (hébergement de la base de données) — France (migration en cours) ;</li>
          <li><strong>Stripe</strong> (paiement de l&apos;abonnement) — États-Unis (CCT 2021/914).</li>
        </ul>
        <p>
          Le Prestataire s&apos;engage à informer le Praticien de tout changement concernant l&apos;ajout ou
          le remplacement de sous-traitants ultérieurs, et à lui permettre d&apos;émettre des objections
          motivées dans un délai de 30 jours, conformément à l&apos;article 28.2 du RGPD.
        </p>
      </section>

      {/* ===== 5. DURÉE ET RÉSILIATION ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 5 — Durée, abonnement et résiliation</h2>

        <h3 className="text-xl font-medium mt-4">5.1 Durée</h3>
        <p>
          Le présent contrat est conclu pour une durée indéterminée à compter de la souscription de
          l&apos;abonnement par le Praticien via Stripe.
        </p>

        <h3 className="text-xl font-medium mt-4">5.2 Abonnement mensuel</h3>
        <p>
          L&apos;abonnement est souscrit via la plateforme de paiement Stripe sur une base mensuelle. Le
          montant de l&apos;abonnement est celui convenu lors de la souscription. Le Prestataire se réserve
          le droit de faire évoluer le tarif, sous réserve d&apos;un préavis de 60 jours. Le Praticien
          dispose alors de la faculté de résilier sans frais si la nouvelle tarification ne lui convient pas.
        </p>
        <p>
          Le paiement est exigible au début de chaque période mensuelle. En cas de défaut de paiement, le
          Prestataire pourra suspendre l&apos;accès à la Plateforme après mise en demeure restée sans effet
          pendant 15 jours, conformément à l&apos;article 1226 du Code civil.
        </p>

        <h3 className="text-xl font-medium mt-4">5.3 Résiliation à l&apos;initiative du Praticien</h3>
        <p>
          Le Praticien peut résilier son abonnement à tout moment via son espace de gestion sur la Plateforme
          ou en adressant une demande par email à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>. La
          résiliation prend effet à la fin de la période d&apos;abonnement en cours. Aucun remboursement
          partiel n&apos;est dû pour la période en cours.
        </p>

        <h3 className="text-xl font-medium mt-4">5.4 Résiliation à l&apos;initiative du Prestataire</h3>
        <p>
          Le Prestataire peut résilier le contrat en cas de manquement grave du Praticien à ses obligations,
          notamment :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Défaut de paiement persistant après mise en demeure ;</li>
          <li>Violation des interdictions prévues à l&apos;article 3.3 (revente, usage IA, ingénierie inverse) ;</li>
          <li>Publication de contenus manifestement illicites ou contraires aux règles déontologiques ;</li>
          <li>Violation des dispositions relatives à la protection des données (articles 4 et DPA).</li>
        </ul>
        <p>
          La résiliation est précédée d&apos;une mise en demeure par email avec accusé de réception, laissant
          un délai de 30 jours pour remédier au manquement. En cas d&apos;urgence ou de manquement
          irrémédiable, le Prestataire peut suspendre l&apos;accès sans préavis, sous réserve d&apos;en
          informer immédiatement le Praticien.
        </p>

        <h3 className="text-xl font-medium mt-4">5.5 Sort des données en fin de contrat</h3>
        <p>
          À l&apos;issue du contrat, quelle qu&apos;en soit la cause, le Prestataire s&apos;engage,
          conformément à l&apos;article 28.3.g du RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>À restituer au Praticien, sur demande formulée dans les 30 jours suivant la résiliation, l&apos;ensemble des données personnelles des patients du Praticien dans un format structuré et exploitable (JSON ou CSV) ;</li>
          <li>À supprimer définitivement l&apos;ensemble des données personnelles des patients du Praticien dans un délai de 60 jours suivant la résiliation, sauf obligation légale de conservation ;</li>
          <li>À fournir une attestation de suppression sur demande du Praticien.</li>
        </ul>
      </section>

      {/* ===== 6. PROPRIÉTÉ INTELLECTUELLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 6 — Propriété intellectuelle</h2>

        <h3 className="text-xl font-medium mt-4">6.1 Propriété du Prestataire</h3>
        <p>
          La Plateforme Sensident, son code source, sa charte graphique, ses marques, logos, noms de domaine,
          et l&apos;ensemble des éléments qui la composent (hors contenus publiés par le Praticien) sont et
          demeurent la propriété exclusive du Prestataire. Le présent contrat ne confère au Praticien aucun
          droit de propriété sur ces éléments, mais une simple licence d&apos;usage dans les conditions
          prévues à l&apos;article 6.3.
        </p>

        <h3 className="text-xl font-medium mt-4">6.2 Propriété du Praticien</h3>
        <p>
          Les articles, textes, images et autres contenus publiés par le Praticien via la Plateforme demeurent
          la propriété intellectuelle exclusive du Praticien. Le Praticien concède au Prestataire, pour la
          durée du contrat, une licence d&apos;usage, de reproduction et de diffusion non exclusive, à titre
          gratuit, sur ces contenus, aux fins exclusives de fonctionnement de la Plateforme et d&apos;envoi
          des newsletters aux patients du Praticien.
        </p>

        <h3 className="text-xl font-medium mt-4">6.3 Licence d&apos;usage de la Plateforme</h3>
        <p>
          Le Prestataire concède au Praticien une licence d&apos;usage de la Plateforme, personnelle,
          non exclusive, non cessible et révocable, pour la durée du contrat, dans le cadre exclusif de
          son activité professionnelle de prévention bucco-dentaire auprès de ses patients. Cette licence
          ne couvre pas l&apos;usage visé à l&apos;article 3.3 (revente, IA, ingénierie inverse).
        </p>
      </section>

      {/* ===== 7. RESPONSABILITÉ ET GARANTIES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 7 — Responsabilité et garanties</h2>

        <h3 className="text-xl font-medium mt-4">7.1 Garanties du Prestataire</h3>
        <p>
          Le Prestataire garantit que la Plateforme est développée conformément aux règles de l&apos;art et
          aux standards professionnels. Il garantit la conformité de la Plateforme aux exigences du RGPD et
          aux présentes conditions contractuelles.
        </p>
        <p>
          Le Prestataire ne garantit pas que la Plateforme réponde à des besoins spécifiques du Praticien
          non expressément prévus, ni que son fonctionnement soit ininterrompu ou exempt d&apos;erreurs.
          Le Praticien reconnaît avoir été informé des fonctionnalités de la Plateforme préalablement à la
          souscription.
        </p>

        <h3 className="text-xl font-medium mt-4">7.2 Limitation de responsabilité</h3>
        <p>
          La responsabilité du Prestataire est limitée aux dommages directs, à l&apos;exclusion des dommages
          indirects (perte de clientèle, perte de chiffre d&apos;affaires, préjudice d&apos;image, etc.).
          En tout état de cause, la responsabilité du Prestataire est plafonnée au montant total des
          abonnements perçus au cours des douze (12) mois précédant le fait générateur.
        </p>
        <p>
          Cette limitation ne s&apos;applique pas en cas de faute intentionnelle, de dol, de dommages
          corporels, ou de violation des obligations essentielles du RGPD engageant la responsabilité du
          Prestataire en application de l&apos;article 82 du RGPD.
        </p>

        <h3 className="text-xl font-medium mt-4">7.3 Contenus médicaux</h3>
        <p>
          Le Praticien assume l&apos;entière responsabilité des contenus médicaux et de prévention qu&apos;il
          publie. Le Prestataire n&apos;exerce aucun contrôle éditorial a priori sur ces contenus et ne saurait
          voir sa responsabilité engagée de ce fait, sauf dans le cadre de l&apos;article 6.I.2 de la LCEN
          (contenus manifestement illicites signalés).
        </p>

        <h3 className="text-xl font-medium mt-4">7.4 Force majeure</h3>
        <p>
          Aucune des Parties ne pourra être tenue responsable de la non-exécution ou des retards dans
          l&apos;exécution de ses obligations résultant d&apos;un cas de force majeure au sens de
          l&apos;article 1218 du Code civil et de la jurisprudence des tribunaux français. La Partie
          invoquant la force majeure en informe l&apos;autre sans délai.
        </p>
      </section>

      {/* ===== 8. ASSURANCES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 8 — Assurances</h2>

        <h3 className="text-xl font-medium mt-4">8.1 Assurance du Praticien</h3>
        <p>
          Conformément à l&apos;article L.1142-2 du Code de la santé publique, le Praticien déclare être
          couvert par une assurance de responsabilité civile professionnelle (RCP) en cours de validité
          pour l&apos;ensemble de ses activités professionnelles, y compris les activités de prévention et
          d&apos;information par voie numérique.
        </p>
        <p>
          Le Praticien s&apos;engage à maintenir cette couverture pendant toute la durée du contrat et à
          en justifier sur demande du Prestataire. À défaut de production de l&apos;attestation d&apos;assurance
          dans un délai de 15 jours suivant la demande, le Prestataire pourra suspendre l&apos;accès au service.
        </p>

        <h3 className="text-xl font-medium mt-4">8.2 Assurance du Prestataire</h3>
        <p>
          Le Prestataire déclare avoir souscrit une assurance de responsabilité civile professionnelle couvrant
          les risques liés à l&apos;exploitation d&apos;une plateforme SaaS, notamment les risques de violation
          de données. Les références de cette assurance seront communiquées au Praticien sur demande.
        </p>
      </section>

      {/* ===== 9. CONFIDENTIALITÉ ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 9 — Confidentialité</h2>
        <p>
          Chaque Partie s&apos;engage à considérer comme confidentielle toute information, de quelque nature
          que ce soit (technique, commerciale, financière, stratégique), appartenant à l&apos;autre Partie
          et dont elle aurait eu connaissance à l&apos;occasion de l&apos;exécution du présent contrat.
        </p>
        <p>
          Cette obligation de confidentialité subsiste pendant toute la durée du contrat et pour une période
          de trois (3) ans après sa cessation. Elle ne s&apos;applique pas aux informations relevant du domaine
          public, déjà connues de la Partie réceptrice, ou dont la divulgation est imposée par la loi.
        </p>
        <p>
          Les données personnelles des patients sont soumises au secret professionnel tel que prévu par
          l&apos;article R.4127-206 du Code de la santé publique, et ne sont pas couvertes par la limitation
          de durée de trois ans : l&apos;obligation de confidentialité est perpétuelle.
        </p>
      </section>

      {/* ===== 10. DONNÉES PERSONNELLES RELATIVES AU PRATICIEN ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 10 — Données personnelles du Praticien</h2>
        <p>
          Dans le cadre de la relation contractuelle, le Prestataire collecte et traite des données personnelles
          relatives au Praticien (nom, adresse email professionnelle, données de paiement, coordonnées
          professionnelles). Ces traitements sont fondés sur l&apos;exécution du présent contrat (art. 6.1.b
          RGPD) et sur les obligations légales (art. 6.1.c RGPD) pour la facturation.
        </p>
        <p>
          Le Praticien dispose des droits prévus aux articles 15 à 22 du RGPD. L&apos;exercice de ces droits
          s&apos;effectue auprès du DPO à <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>.
          Les données du Praticien sont conservées pendant la durée du contrat, puis pour une durée de 5 ans
          à compter de la fin du contrat pour les données comptables et de facturation (article L.123-22 du
          Code de commerce).
        </p>
      </section>

      {/* ===== 11. LOI APPLICABLE ET LITIGES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 11 — Loi applicable et règlement des litiges</h2>

        <h3 className="text-xl font-medium mt-4">11.1 Droit applicable</h3>
        <p>
          Le présent contrat est soumis au droit français. Les Parties conviennent que la Convention des
          Nations Unies sur les contrats de vente internationale de marchandises (CVIM) ne s&apos;applique pas.
        </p>

        <h3 className="text-xl font-medium mt-4">11.2 Règlement amiable</h3>
        <p>
          Les Parties s&apos;engagent à rechercher une solution amiable avant toute action judiciaire. Toute
          contestation sera préalablement soumise à une tentative de résolution amiable, par échange de
          correspondances écrites.
        </p>

        <h3 className="text-xl font-medium mt-4">11.3 Attribution de compétence</h3>
        <p>
          À défaut d&apos;accord amiable, tout litige relatif à la validité, l&apos;interprétation,
          l&apos;exécution ou la résiliation du présent contrat sera porté devant les tribunaux compétents
          du ressort de Nantes (France), nonobstant pluralité de défendeurs ou appel en garantie, y compris
          en matière de référé.
        </p>

        <h3 className="text-xl font-medium mt-4">11.4 Nullité partielle</h3>
        <p>
          Si une ou plusieurs stipulations du présent contrat sont déclarées nulles, inapplicables ou non
          écrites par une décision de justice ou une autorité compétente, les autres stipulations demeureront
          en vigueur et continueront à produire leurs effets. Les Parties substitueront aux clauses annulées
          des clauses valides et d&apos;effet économique équivalent.
        </p>
      </section>

      {/* ===== 12. DISPOSITIONS DIVERSES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 12 — Dispositions diverses</h2>

        <h3 className="text-xl font-medium mt-4">12.1 Intégralité</h3>
        <p>
          Le présent contrat, incluant son Annexe 1 (DPA), constitue l&apos;intégralité de l&apos;accord entre
          les Parties et remplace tout accord, déclaration ou engagement antérieur relatif au même objet.
        </p>

        <h3 className="text-xl font-medium mt-4">12.2 Modification</h3>
        <p>
          Le Prestataire se réserve le droit de modifier le présent contrat pour prendre en compte les évolutions
          légales, réglementaires ou techniques. En cas de modification substantielle, le Praticien est informé
          par email au moins 30 jours avant l&apos;entrée en vigueur. Le Praticien dispose de la faculté de
          résilier sans frais si les modifications ne lui conviennent pas. L&apos;absence de résiliation dans
          ce délai vaut acceptation.
        </p>

        <h3 className="text-xl font-medium mt-4">12.3 Cession</h3>
        <p>
          Le Praticien ne peut céder tout ou partie de ses droits et obligations au titre du présent contrat
          sans l&apos;autorisation préalable écrite du Prestataire. Le Prestataire peut céder le contrat à
          tout tiers dans le cadre d&apos;une fusion, acquisition, cession de branche d&apos;activité, sous
          réserve d&apos;en informer le Praticien avec un préavis de 30 jours.
        </p>

        <h3 className="text-xl font-medium mt-4">12.4 Notification</h3>
        <p>
          Toute notification relative au présent contrat est adressée par email avec accusé de réception :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Au Prestataire : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></li>
          <li>Au Praticien : à l&apos;adresse email renseignée lors de la souscription.</li>
        </ul>
        <p className="mt-2">
          Les Parties s&apos;engagent à tenir à jour leurs coordonnées et à notifier tout changement sans délai.
        </p>
      </section>

      {/* ===== ANNEXE 1 : DPA ===== */}
      <section>
        <h2 className="text-2xl font-semibold border-t border-border pt-8 mt-12">
          Annexe 1 — Accord de Traitement des Données (DPA)
        </h2>

        <h3 className="text-xl font-medium mt-4">A1.1 Objet et champ d&apos;application</h3>
        <p>
          La présente Annexe fait partie intégrante du Contrat d&apos;abonnement et d&apos;utilisation de la
          Plateforme Sensident. Elle définit les obligations respectives des Parties relatives au traitement
          des données à caractère personnel, conformément à l&apos;article 28 du RGPD.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.2 Définitions</h3>
        <p>
          Les termes utilisés dans la présente Annexe ont la signification qui leur est attribuée par l&apos;article
          4 du RGPD. Les termes « responsable de traitement » et « sous-traitant » renvoient respectivement au
          Praticien et au Prestataire, tels que qualifiés à l&apos;article 4.1 du présent contrat.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.3 Description du traitement</h3>
        <p>
          <strong>Objet</strong> : fourniture de la Plateforme Sensident de prévention bucco-dentaire par
          newsletter.
        </p>
        <p>
          <strong>Nature du traitement</strong> : collecte, enregistrement, organisation, conservation,
          extraction, et destruction des données personnelles pour le compte du responsable de traitement.
        </p>
        <p>
          <strong>Finalités</strong> : envoi de newsletters, mesure d&apos;audience, collecte de réactions,
          gestion des inscriptions et désabonnements.
        </p>
        <p>
          <strong>Catégories de personnes concernées</strong> : patients du Praticien, utilisateurs de la
          Plateforme.
        </p>
        <p>
          <strong>Catégories de données</strong> : adresse email, nom, token d&apos;invitation, consentements
          (horodatage + choix), préférences newsletter, données de heartbeat (timestamp, articleSlug, indicateur
          de visibilité), réactions (👍👎, articleSlug).
        </p>
        <p>
          <strong>Durée du traitement</strong> : durée du contrat, puis suppression dans les conditions de
          l&apos;article 5.5.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.4 Obligations du sous-traitant (art. 28.3 RGPD)</h3>
        <p>Le Prestataire s&apos;engage à :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>(a)</strong> Traiter les données personnelles exclusivement sur instructions documentées du
            responsable de traitement, y compris en ce qui concerne les transferts hors UE. Les instructions sont
            celles définies au présent contrat et au DPA. Toute instruction supplémentaire fera l&apos;objet
            d&apos;un avenant.
          </li>
          <li>
            <strong>(b)</strong> Veiller à ce que les personnes autorisées à traiter les données soient soumises
            à une obligation de confidentialité appropriée, contractuelle ou légale.
          </li>
          <li>
            <strong>(c)</strong> Mettre en œuvre les mesures techniques et organisationnelles décrites à
            l&apos;article A1.5 pour garantir un niveau de sécurité adapté au risque.
          </li>
          <li>
            <strong>(d)</strong> Respecter les conditions de recours à des sous-traitants ultérieurs prévues
            à l&apos;article A1.6.
          </li>
          <li>
            <strong>(e)</strong> Assister le responsable de traitement, dans la mesure du possible et par
            des mesures techniques et organisationnelles appropriées, pour répondre aux demandes d&apos;exercice
            des droits des personnes concernées (art. 15 à 22 RGPD).
          </li>
          <li>
            <strong>(f)</strong> Assister le responsable de traitement pour le respect des obligations de
            sécurité (art. 32 RGPD), de notification des violations (art. 33 RGPD), de communication des
            violations aux personnes concernées (art. 34 RGPD), et de réalisation d&apos;analyses d&apos;impact
            (art. 35 RGPD).
          </li>
          <li>
            <strong>(g)</strong> Supprimer ou restituer toutes les données personnelles, au choix du responsable
            de traitement, en fin de contrat, et supprimer les copies existantes, sauf obligation légale de
            conservation.
          </li>
          <li>
            <strong>(h)</strong> Mettre à disposition du responsable de traitement toutes les informations
            nécessaires pour démontrer le respect des obligations prévues à l&apos;article 28 du RGPD, et
            faciliter les audits, inspections et contrôles.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.5 Mesures techniques et organisationnelles (art. 32 RGPD)</h3>
        <p>
          Le Prestataire met en œuvre les mesures suivantes :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Pseudonymisation et anonymisation</strong> : agrégation des données avec seuil minimum de 5 patients avant affichage au Praticien.</li>
          <li><strong>Chiffrement en transit</strong> : TLS 1.3 pour l&apos;ensemble des communications.</li>
          <li><strong>Chiffrement au repos</strong> : chiffrement AES-256 de la base de données.</li>
          <li><strong>Sécurité de la base de données</strong> : Row-Level Security (RLS) PostgreSQL assurant l&apos;isolation des données par Praticien.</li>
          <li><strong>Contrôle d&apos;accès</strong> : authentification forte, politique de moindre privilège, accès aux données limité au personnel autorisé.</li>
          <li><strong>Journalisation</strong> : audit logs des accès et opérations, conservation 5 ans.</li>
          <li><strong>Sauvegarde</strong> : sauvegardes quotidiennes chiffrées, rétention 30 jours.</li>
          <li><strong>Continuité d&apos;activité</strong> : plan de reprise d&apos;activité (PRA) avec objectif de restauration sous 24 heures.</li>
          <li><strong>Mises à jour</strong> : application des correctifs de sécurité dans les 7 jours suivant leur publication.</li>
          <li><strong>Sensibilisation</strong> : formation du personnel habilité aux bonnes pratiques RGPD et sécurité.</li>
          <li><strong>Hébergement HDS</strong> : certification HDS de l&apos;hébergeur (migration en cours), conformément aux articles L.1111-8 et R.1111-9 et suivants du Code de la santé publique.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.6 Sous-traitants ultérieurs (art. 28.2 et 28.4 RGPD)</h3>
        <p>
          Le Prestataire ne recourt à un sous-traitant ultérieur qu&apos;avec l&apos;autorisation générale
          écrite du responsable de traitement. Cette autorisation est réputée accordée pour les sous-traitants
          listés à l&apos;article 4.4 du contrat.
        </p>
        <p>
          En cas d&apos;ajout ou de remplacement d&apos;un sous-traitant ultérieur, le Prestataire informe le
          responsable de traitement par email, en précisant le nom, l&apos;adresse et la nature des traitements
          confiés. Le responsable de traitement dispose d&apos;un délai de 30 jours pour émettre des objections
          motivées. En l&apos;absence d&apos;objection, le recours est réputé accepté.
        </p>
        <p>
          Le Prestataire impose contractuellement à ses sous-traitants ultérieurs des obligations de protection
          des données au moins équivalentes à celles du présent DPA, conformément à l&apos;article 28.4 du RGPD.
          Le Prestataire demeure pleinement responsable envers le responsable de traitement de l&apos;exécution
          par le sous-traitant ultérieur de ses obligations.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.7 Violations de données (art. 33 et 34 RGPD)</h3>
        <p>
          En cas de violation de données à caractère personnel affectant les données traitées pour le compte
          du responsable de traitement, le Prestataire s&apos;engage à :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Notifier le responsable de traitement dans les meilleurs délais, et au plus tard 24 heures après en avoir pris connaissance ;</li>
          <li>Fournir toutes les informations requises par l&apos;article 33.3 du RGPD (nature de la violation, catégories et nombre de personnes concernées, conséquences probables, mesures prises ou envisagées) ;</li>
          <li>Coopérer avec le responsable de traitement pour la notification à la CNIL dans le délai de 72 heures prévu à l&apos;article 33 du RGPD ;</li>
          <li>Prendre toutes les mesures nécessaires pour limiter les conséquences de la violation et prévenir sa répétition.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.8 Audit</h3>
        <p>
          Le responsable de traitement, ou un auditeur indépendant mandaté par lui et soumis à une obligation
          de confidentialité, peut procéder à un audit des mesures techniques et organisationnelles mises en
          œuvre par le Prestataire, dans la limite d&apos;un audit par année civile, sauf circonstances
          particulières (violation de données, suspicion de non-conformité).
        </p>
        <p>
          L&apos;audit est réalisé aux frais du responsable de traitement, après notification écrite avec un
          préavis d&apos;au moins 30 jours, pendant les heures ouvrées et sans perturber le fonctionnement du
          service. Le Prestataire s&apos;engage à fournir les informations nécessaires et à coopérer de bonne
          foi. L&apos;audit peut également être satisfait par la fourniture d&apos;une certification ou d&apos;un
          rapport d&apos;audit externe récent (datant de moins de 12 mois).
        </p>

        <h3 className="text-xl font-medium mt-4">A1.9 Obligations du responsable de traitement</h3>
        <p>
          Le Praticien, en qualité de responsable de traitement, s&apos;engage à :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Collecter les données personnelles de ses patients de manière licite, loyale et transparente ;</li>
          <li>Informer ses patients des traitements mis en œuvre et de leurs droits ;</li>
          <li>Recueillir les consentements nécessaires, le cas échéant ;</li>
          <li>Respecter les droits des personnes concernées et répondre à leurs demandes ;</li>
          <li>S&apos;assurer que les instructions données au sous-traitant sont conformes au RGPD ;</li>
          <li>Tenir un registre des activités de traitement (art. 30 RGPD).</li>
        </ul>
      </section>
    </main>
  );
}
