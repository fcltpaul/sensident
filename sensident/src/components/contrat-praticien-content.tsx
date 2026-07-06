export function ContratPraticienContent() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Contrat d&apos;abonnement et d&apos;utilisation de la Plateforme Sensident</h1>
      <p className="text-muted-foreground">
        Version 1.0 â€” DerniÃ¨re mise Ã  jour : 11 juin 2026
      </p>
      <p>
        <strong>Entre les soussignÃ©s :</strong>
      </p>
      <div className="bg-muted/30 rounded-lg p-4 space-y-1">
        <p>
          <strong>Sensident</strong>, ci-aprÃ¨s dÃ©nommÃ© le Â« Prestataire Â», reprÃ©sentÃ© par Paul Foucault,
          entrepreneur individuel ou SAS en cours d&apos;immatriculation, dont le siÃ¨ge social sera communiquÃ©
          lors de l&apos;immatriculation, email : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>,
        </p>
        <p className="mt-2"><strong>ET</strong></p>
        <p className="mt-2">
          Le <strong>chirurgien-dentiste ou cabinet dentaire</strong>, ci-aprÃ¨s dÃ©nommÃ© le Â« Praticien Â»,
          personne physique ou morale dÃ»ment inscrite Ã  l&apos;Ordre national des chirurgiens-dentistes,
          ayant souscrit Ã  l&apos;abonnement Sensident via Stripe et acceptÃ© les prÃ©sentes conditions
          gÃ©nÃ©rales de contrat.
        </p>
      </div>
      <p className="mt-2">
        Ci-aprÃ¨s dÃ©nommÃ©s individuellement la Â« Partie Â» et collectivement les Â« Parties Â».
      </p>
      <p><strong>IL A Ã‰TÃ‰ CONVENU CE QUI SUIT :</strong></p>

      {/* ===== 1. OBJET ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 1 â€” Objet du contrat</h2>
        <p>
          Le prÃ©sent contrat a pour objet de dÃ©finir les conditions dans lesquelles le Prestataire met Ã 
          disposition du Praticien la Plateforme Sensident, solution SaaS de prÃ©vention bucco-dentaire par
          newsletter, et les obligations rÃ©ciproques des Parties dans le cadre de cette relation contractuelle.
        </p>
        <p>
          La Plateforme permet au Praticien :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>De publier des articles de prÃ©vention bucco-dentaire Ã  destination de ses patients ;</li>
          <li>D&apos;inviter ses patients Ã  s&apos;abonner via un token d&apos;invitation unique ;</li>
          <li>De diffuser des newsletters Ã  ses patients abonnÃ©s ;</li>
          <li>De consulter des statistiques agrÃ©gÃ©es de lecture et de rÃ©actions ;</li>
          <li>De gÃ©rer ses abonnÃ©s et suivre l&apos;impact de sa communication prÃ©ventive.</li>
        </ul>
        <p>
          Le prÃ©sent contrat est conclu pour une durÃ©e indÃ©terminÃ©e Ã  compter de la souscription, sous rÃ©serve
          du paiement de l&apos;abonnement mensuel via Stripe et du respect des prÃ©sentes conditions.
        </p>
      </section>

      {/* ===== 2. OBLIGATIONS DE SENSIDENT ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 2 â€” Obligations du Prestataire (Sensident)</h2>

        <h3 className="text-xl font-medium mt-4">2.1 Mise Ã  disposition de la Plateforme</h3>
        <p>
          Le Prestataire s&apos;engage Ã  fournir au Praticien un accÃ¨s Ã  la Plateforme Sensident via une
          interface web accessible en ligne, 24 heures sur 24 et 7 jours sur 7, sous rÃ©serve des opÃ©rations
          de maintenance programmÃ©e et des cas de force majeure. Le Prestataire met en Å“uvre les moyens
          nÃ©cessaires pour assurer une disponibilitÃ© minimale de 99,5 % par mois calendaire, calculÃ©e hors
          pÃ©riodes de maintenance planifiÃ©e.
        </p>

        <h3 className="text-xl font-medium mt-4">2.2 HÃ©bergement conforme HDS</h3>
        <p>
          Le Prestataire s&apos;engage Ã  hÃ©berger les donnÃ©es de la Plateforme chez un hÃ©bergeur certifiÃ©
          HDS (HÃ©bergement des DonnÃ©es de SantÃ©) conformÃ©ment aux articles L.1111-8 et R.1111-9 et suivants
          du Code de la santÃ© publique. La migration vers un hÃ©bergeur certifiÃ© HDS situÃ© en France est en
          cours. En phase transitoire, les donnÃ©es sont hÃ©bergÃ©es chez Neon (AWS Europe Central, Francfort,
          Allemagne) avec un niveau de sÃ©curitÃ© conforme Ã  l&apos;article 32 du RGPD.
        </p>
        <p>
          Le Prestataire garantit que l&apos;ensemble des donnÃ©es Ã  caractÃ¨re personnel est stockÃ© et traitÃ©
          au sein de l&apos;Union europÃ©enne, conformÃ©ment au chapitre V du RGPD. Le Prestataire informera
          le Praticien de la finalisation de la migration HDS dans un dÃ©lai de 15 jours.
        </p>

        <h3 className="text-xl font-medium mt-4">2.3 ConformitÃ© RGPD</h3>
        <p>
          Le Prestataire s&apos;engage Ã  traiter les donnÃ©es Ã  caractÃ¨re personnel conformÃ©ment au RÃ¨glement
          GÃ©nÃ©ral sur la Protection des DonnÃ©es (RGPD â€” RÃ¨glement UE 2016/679) et Ã  la loi nÂ° 78-17 du
          6 janvier 1978 modifiÃ©e. Il agit en qualitÃ© de sous-traitant au sens de l&apos;article 28 du RGPD
          pour le compte du Praticien, responsable de traitement. Les obligations dÃ©taillÃ©es relatives au
          traitement des donnÃ©es sont prÃ©cisÃ©es Ã  l&apos;article 5 du prÃ©sent contrat et dans l&apos;Accord
          de Traitement des DonnÃ©es (DPA) figurant en Annexe 1.
        </p>

        <h3 className="text-xl font-medium mt-4">2.4 Support technique</h3>
        <p>
          Le Prestataire assure un support technique par email Ã 
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a> pendant
          les jours ouvrÃ©s (lundi au vendredi, 9h-18h CET), avec un engagement de premiÃ¨re rÃ©ponse sous
          48 heures ouvrÃ©es. Le support couvre les incidents techniques, les questions d&apos;utilisation
          et les demandes d&apos;assistance. Les interventions de maintenance programmÃ©e sont annoncÃ©es au
          moins 48 heures Ã  l&apos;avance.
        </p>

        <h3 className="text-xl font-medium mt-4">2.5 Ã‰volution du service</h3>
        <p>
          Le Prestataire se rÃ©serve le droit de faire Ã©voluer la Plateforme pour en amÃ©liorer les
          fonctionnalitÃ©s, la sÃ©curitÃ© ou la conformitÃ©. Les Ã©volutions substantielles sont communiquÃ©es
          au Praticien avec un prÃ©avis d&apos;au moins 30 jours. Les Ã©volutions mineures (correctifs,
          amÃ©liorations d&apos;interface) peuvent Ãªtre dÃ©ployÃ©es sans prÃ©avis, dÃ¨s lors qu&apos;elles
          n&apos;altÃ¨rent pas les fonctionnalitÃ©s essentielles.
        </p>
      </section>

      {/* ===== 3. OBLIGATIONS DU PRATICIEN ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 3 â€” Obligations du Praticien</h2>

        <h3 className="text-xl font-medium mt-4">3.1 Usage conforme</h3>
        <p>
          Le Praticien s&apos;engage Ã  utiliser la Plateforme conformÃ©ment aux prÃ©sentes conditions, aux
          lois et rÃ¨glements en vigueur, et aux rÃ¨gles dÃ©ontologiques applicables Ã  la profession de
          chirurgien-dentiste, telles que prÃ©vues par le Code de la santÃ© publique (articles R.4127-201
          et suivants) et le Code de dÃ©ontologie des chirurgiens-dentistes.
        </p>

        <h3 className="text-xl font-medium mt-4">3.2 Contenus publiÃ©s</h3>
        <p>
          Le Praticien est seul responsable des contenus (articles, newsletters, textes, images) qu&apos;il
          publie via la Plateforme. Il garantit :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Que ces contenus sont conformes aux lois et rÃ¨glements en vigueur, notamment le Code de la santÃ© publique, et aux recommandations de l&apos;Ordre national des chirurgiens-dentistes ;</li>
          <li>Qu&apos;ils ne contiennent pas d&apos;informations mÃ©dicales erronÃ©es, trompeuses ou non conformes aux donnÃ©es acquises de la science (articles R.4127-212 et R.4127-215 du Code de la santÃ© publique) ;</li>
          <li>Qu&apos;ils ne portent pas atteinte aux droits de tiers (propriÃ©tÃ© intellectuelle, droit Ã  l&apos;image, vie privÃ©e, diffamation) ;</li>
          <li>Qu&apos;ils respectent l&apos;interdiction de la publicitÃ© directe ou indirecte pour le cabinet dentaire, conformÃ©ment Ã  l&apos;article R.4127-215 du Code de la santÃ© publique.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">3.3 Interdictions</h3>
        <p>Le Praticien s&apos;interdit formellement :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Revente</strong> : de revendre, concÃ©der en licence, sous-licencier, louer ou transfÃ©rer
            l&apos;accÃ¨s Ã  la Plateforme Ã  un tiers non autorisÃ©. L&apos;abonnement est nominatif et attachÃ©
            au cabinet dentaire contractant.
          </li>
          <li>
            <strong>Usage IA non autorisÃ©</strong> : de connecter la Plateforme Ã  un systÃ¨me d&apos;intelligence
            artificielle, d&apos;apprentissage automatique ou de traitement automatisÃ© externe sans autorisation
            prÃ©alable expresse du Prestataire. Le Praticien s&apos;engage Ã  ne pas utiliser les donnÃ©es de la
            Plateforme pour entraÃ®ner, alimenter ou enrichir un modÃ¨le d&apos;IA, de quelque nature que ce soit.
          </li>
          <li>
            <strong>IngÃ©nierie inverse</strong> : de dÃ©compiler, dÃ©sassembler ou pratiquer l&apos;ingÃ©nierie
            inverse de la Plateforme, sauf dans les limites prÃ©vues par l&apos;article L.122-6-1 du Code de
            la propriÃ©tÃ© intellectuelle.
          </li>
          <li>
            <strong>Usage illicite</strong> : d&apos;utiliser la Plateforme Ã  des fins illicites, frauduleuses,
            ou susceptibles de porter atteinte Ã  la sÃ©curitÃ©, Ã  l&apos;intÃ©gritÃ© ou Ã  la disponibilitÃ© du service.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">3.4 Information des patients</h3>
        <p>
          Le Praticien s&apos;engage Ã  informer ses patients de l&apos;existence de la Plateforme, des modalitÃ©s
          d&apos;inscription (double opt-in, token d&apos;invitation), et de la nature des donnÃ©es collectÃ©es.
          Le Praticien s&apos;engage Ã  respecter et Ã  faire respecter le principe du double opt-in : il ne doit
          en aucun cas inscrire lui-mÃªme un patient, ni prÃ©-remplir un formulaire d&apos;inscription, ni
          exercer de pression sur le patient pour obtenir son consentement.
        </p>
        <p>
          Le Praticien s&apos;engage Ã  informer ses patients de leurs droits au titre du RGPD (accÃ¨s,
          rectification, effacement, opposition, portabilitÃ©) et Ã  les orienter vers la
          <a href="/politique-confidentialite" className="underline text-primary"> Politique de confidentialitÃ©</a> de Sensident.
        </p>

        <h3 className="text-xl font-medium mt-4">3.5 SÃ©curitÃ© du compte</h3>
        <p>
          Le Praticien est responsable de la confidentialitÃ© de ses identifiants de connexion et de l&apos;usage
          qui en est fait. Il s&apos;engage Ã  informer immÃ©diatement le Prestataire de toute utilisation non
          autorisÃ©e de son compte ou de toute violation de sÃ©curitÃ©. Le Prestataire ne saurait Ãªtre tenu
          responsable des dommages rÃ©sultant d&apos;une utilisation non autorisÃ©e du compte du Praticien.
        </p>
      </section>

      {/* ===== 4. TRAITEMENT DES DONNÃ‰ES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 4 â€” Traitement des donnÃ©es Ã  caractÃ¨re personnel</h2>

        <h3 className="text-xl font-medium mt-4">4.1 Qualification des Parties</h3>
        <p>
          Au sens du RGPD (article 4.7 et 4.8) :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Le <strong>Praticien</strong> agit en qualitÃ© de <strong>responsable de traitement</strong> Ã 
            l&apos;Ã©gard des donnÃ©es personnelles de ses patients collectÃ©es via la Plateforme. Il dÃ©termine
            les finalitÃ©s (prÃ©vention bucco-dentaire, information des patients) et les moyens du traitement.
          </li>
          <li>
            Le <strong>Prestataire (Sensident)</strong> agit en qualitÃ© de <strong>sous-traitant</strong> au
            sens de l&apos;article 28 du RGPD. Il traite les donnÃ©es pour le compte du Praticien, conformÃ©ment
            Ã  ses instructions documentÃ©es.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">4.2 Instructions du responsable de traitement</h3>
        <p>
          Le Prestataire s&apos;engage Ã  traiter les donnÃ©es personnelles exclusivement pour les finalitÃ©s
          suivantes, conformÃ©ment aux instructions documentÃ©es du Praticien (article 28.3.a du RGPD) :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Collecte et stockage des donnÃ©es d&apos;inscription (email, nom, token) ;</li>
          <li>Gestion du mÃ©canisme de double opt-in ;</li>
          <li>Envoi des newsletters aux patients abonnÃ©s ;</li>
          <li>Collecte et stockage des donnÃ©es de heartbeat (lecture) et de rÃ©actions (ðŸ‘ðŸ‘Ž) ;</li>
          <li>Production de statistiques agrÃ©gÃ©es Ã  destination du Praticien (avec seuil minimum de 5 patients) ;</li>
          <li>Gestion des dÃ©sabonnements et des droits des personnes concernÃ©es.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">4.3 Accord de Traitement des DonnÃ©es (DPA)</h3>
        <p>
          L&apos;Accord de Traitement des DonnÃ©es (DPA) figure en <strong>Annexe 1</strong> au prÃ©sent contrat.
          Il prÃ©cise notamment :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>L&apos;objet, la nature et la finalitÃ© du traitement (art. 28.3 RGPD) ;</li>
          <li>Les catÃ©gories de donnÃ©es et de personnes concernÃ©es ;</li>
          <li>Les mesures techniques et organisationnelles de sÃ©curitÃ© (art. 32 RGPD) ;</li>
          <li>Les obligations du sous-traitant (art. 28.3 a Ã  h RGPD) ;</li>
          <li>Le recours Ã  des sous-traitants ultÃ©rieurs (art. 28.2 et 28.4 RGPD) ;</li>
          <li>La gestion des violations de donnÃ©es (art. 33 et 34 RGPD) ;</li>
          <li>Le sort des donnÃ©es en fin de contrat (art. 28.3.g RGPD).</li>
        </ul>
        <p>
          En signant le prÃ©sent contrat, le Praticien reconnaÃ®t avoir pris connaissance et accepter les termes
          du DPA.
        </p>

        <h3 className="text-xl font-medium mt-4">4.4 Sous-traitants ultÃ©rieurs</h3>
        <p>
          Le Prestataire informe le Praticien du recours aux sous-traitants ultÃ©rieurs suivants :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Brevo</strong> (envoi d&apos;emails transactionnels et campagnes) â€” Allemagne ;</li>
          <li><strong>HÃ©bergeur HDS</strong> (hÃ©bergement de la base de donnÃ©es) â€” France (migration en cours) ;</li>
          <li><strong>Stripe</strong> (paiement de l&apos;abonnement) â€” Ã‰tats-Unis (CCT 2021/914).</li>
        </ul>
        <p>
          Le Prestataire s&apos;engage Ã  informer le Praticien de tout changement concernant l&apos;ajout ou
          le remplacement de sous-traitants ultÃ©rieurs, et Ã  lui permettre d&apos;Ã©mettre des objections
          motivÃ©es dans un dÃ©lai de 30 jours, conformÃ©ment Ã  l&apos;article 28.2 du RGPD.
        </p>
      </section>

      {/* ===== 5. DURÃ‰E ET RÃ‰SILIATION ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 5 â€” DurÃ©e, abonnement et rÃ©siliation</h2>

        <h3 className="text-xl font-medium mt-4">5.1 DurÃ©e</h3>
        <p>
          Le prÃ©sent contrat est conclu pour une durÃ©e indÃ©terminÃ©e Ã  compter de la souscription de
          l&apos;abonnement par le Praticien via Stripe.
        </p>

        <h3 className="text-xl font-medium mt-4">5.2 Abonnement mensuel</h3>
        <p>
          L&apos;abonnement est souscrit via la plateforme de paiement Stripe sur une base mensuelle. Le
          montant de l&apos;abonnement est celui convenu lors de la souscription. Le Prestataire se rÃ©serve
          le droit de faire Ã©voluer le tarif, sous rÃ©serve d&apos;un prÃ©avis de 60 jours. Le Praticien
          dispose alors de la facultÃ© de rÃ©silier sans frais si la nouvelle tarification ne lui convient pas.
        </p>
        <p>
          Le paiement est exigible au dÃ©but de chaque pÃ©riode mensuelle. En cas de dÃ©faut de paiement, le
          Prestataire pourra suspendre l&apos;accÃ¨s Ã  la Plateforme aprÃ¨s mise en demeure restÃ©e sans effet
          pendant 15 jours, conformÃ©ment Ã  l&apos;article 1226 du Code civil.
        </p>

        <h3 className="text-xl font-medium mt-4">5.3 RÃ©siliation Ã  l&apos;initiative du Praticien</h3>
        <p>
          Le Praticien peut rÃ©silier son abonnement Ã  tout moment via son espace de gestion sur la Plateforme
          ou en adressant une demande par email Ã 
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>. La
          rÃ©siliation prend effet Ã  la fin de la pÃ©riode d&apos;abonnement en cours. Aucun remboursement
          partiel n&apos;est dÃ» pour la pÃ©riode en cours.
        </p>

        <h3 className="text-xl font-medium mt-4">5.4 RÃ©siliation Ã  l&apos;initiative du Prestataire</h3>
        <p>
          Le Prestataire peut rÃ©silier le contrat en cas de manquement grave du Praticien Ã  ses obligations,
          notamment :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>DÃ©faut de paiement persistant aprÃ¨s mise en demeure ;</li>
          <li>Violation des interdictions prÃ©vues Ã  l&apos;article 3.3 (revente, usage IA, ingÃ©nierie inverse) ;</li>
          <li>Publication de contenus manifestement illicites ou contraires aux rÃ¨gles dÃ©ontologiques ;</li>
          <li>Violation des dispositions relatives Ã  la protection des donnÃ©es (articles 4 et DPA).</li>
        </ul>
        <p>
          La rÃ©siliation est prÃ©cÃ©dÃ©e d&apos;une mise en demeure par email avec accusÃ© de rÃ©ception, laissant
          un dÃ©lai de 30 jours pour remÃ©dier au manquement. En cas d&apos;urgence ou de manquement
          irrÃ©mÃ©diable, le Prestataire peut suspendre l&apos;accÃ¨s sans prÃ©avis, sous rÃ©serve d&apos;en
          informer immÃ©diatement le Praticien.
        </p>

        <h3 className="text-xl font-medium mt-4">5.5 Sort des donnÃ©es en fin de contrat</h3>
        <p>
          Ã€ l&apos;issue du contrat, quelle qu&apos;en soit la cause, le Prestataire s&apos;engage,
          conformÃ©ment Ã  l&apos;article 28.3.g du RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ã€ restituer au Praticien, sur demande formulÃ©e dans les 30 jours suivant la rÃ©siliation, l&apos;ensemble des donnÃ©es personnelles des patients du Praticien dans un format structurÃ© et exploitable (JSON ou CSV) ;</li>
          <li>Ã€ supprimer dÃ©finitivement l&apos;ensemble des donnÃ©es personnelles des patients du Praticien dans un dÃ©lai de 60 jours suivant la rÃ©siliation, sauf obligation lÃ©gale de conservation ;</li>
          <li>Ã€ fournir une attestation de suppression sur demande du Praticien.</li>
        </ul>
      </section>

      {/* ===== 6. PROPRIÃ‰TÃ‰ INTELLECTUELLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 6 â€” PropriÃ©tÃ© intellectuelle</h2>

        <h3 className="text-xl font-medium mt-4">6.1 PropriÃ©tÃ© du Prestataire</h3>
        <p>
          La Plateforme Sensident, son code source, sa charte graphique, ses marques, logos, noms de domaine,
          et l&apos;ensemble des Ã©lÃ©ments qui la composent (hors contenus publiÃ©s par le Praticien) sont et
          demeurent la propriÃ©tÃ© exclusive du Prestataire. Le prÃ©sent contrat ne confÃ¨re au Praticien aucun
          droit de propriÃ©tÃ© sur ces Ã©lÃ©ments, mais une simple licence d&apos;usage dans les conditions
          prÃ©vues Ã  l&apos;article 6.3.
        </p>

        <h3 className="text-xl font-medium mt-4">6.2 PropriÃ©tÃ© du Praticien</h3>
        <p>
          Les articles, textes, images et autres contenus publiÃ©s par le Praticien via la Plateforme demeurent
          la propriÃ©tÃ© intellectuelle exclusive du Praticien. Le Praticien concÃ¨de au Prestataire, pour la
          durÃ©e du contrat, une licence d&apos;usage, de reproduction et de diffusion non exclusive, Ã  titre
          gratuit, sur ces contenus, aux fins exclusives de fonctionnement de la Plateforme et d&apos;envoi
          des newsletters aux patients du Praticien.
        </p>

        <h3 className="text-xl font-medium mt-4">6.3 Licence d&apos;usage de la Plateforme</h3>
        <p>
          Le Prestataire concÃ¨de au Praticien une licence d&apos;usage de la Plateforme, personnelle,
          non exclusive, non cessible et rÃ©vocable, pour la durÃ©e du contrat, dans le cadre exclusif de
          son activitÃ© professionnelle de prÃ©vention bucco-dentaire auprÃ¨s de ses patients. Cette licence
          ne couvre pas l&apos;usage visÃ© Ã  l&apos;article 3.3 (revente, IA, ingÃ©nierie inverse).
        </p>
      </section>

      {/* ===== 7. RESPONSABILITÃ‰ ET GARANTIES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 7 â€” ResponsabilitÃ© et garanties</h2>

        <h3 className="text-xl font-medium mt-4">7.1 Garanties du Prestataire</h3>
        <p>
          Le Prestataire garantit que la Plateforme est dÃ©veloppÃ©e conformÃ©ment aux rÃ¨gles de l&apos;art et
          aux standards professionnels. Il garantit la conformitÃ© de la Plateforme aux exigences du RGPD et
          aux prÃ©sentes conditions contractuelles.
        </p>
        <p>
          Le Prestataire ne garantit pas que la Plateforme rÃ©ponde Ã  des besoins spÃ©cifiques du Praticien
          non expressÃ©ment prÃ©vus, ni que son fonctionnement soit ininterrompu ou exempt d&apos;erreurs.
          Le Praticien reconnaÃ®t avoir Ã©tÃ© informÃ© des fonctionnalitÃ©s de la Plateforme prÃ©alablement Ã  la
          souscription.
        </p>

        <h3 className="text-xl font-medium mt-4">7.2 Limitation de responsabilitÃ©</h3>
        <p>
          La responsabilitÃ© du Prestataire est limitÃ©e aux dommages directs, Ã  l&apos;exclusion des dommages
          indirects (perte de clientÃ¨le, perte de chiffre d&apos;affaires, prÃ©judice d&apos;image, etc.).
          En tout Ã©tat de cause, la responsabilitÃ© du Prestataire est plafonnÃ©e au montant total des
          abonnements perÃ§us au cours des douze (12) mois prÃ©cÃ©dant le fait gÃ©nÃ©rateur.
        </p>
        <p>
          Cette limitation ne s&apos;applique pas en cas de faute intentionnelle, de dol, de dommages
          corporels, ou de violation des obligations essentielles du RGPD engageant la responsabilitÃ© du
          Prestataire en application de l&apos;article 82 du RGPD.
        </p>

        <h3 className="text-xl font-medium mt-4">7.3 Contenus mÃ©dicaux</h3>
        <p>
          Le Praticien assume l&apos;entiÃ¨re responsabilitÃ© des contenus mÃ©dicaux et de prÃ©vention qu&apos;il
          publie. Le Prestataire n&apos;exerce aucun contrÃ´le Ã©ditorial a priori sur ces contenus et ne saurait
          voir sa responsabilitÃ© engagÃ©e de ce fait, sauf dans le cadre de l&apos;article 6.I.2 de la LCEN
          (contenus manifestement illicites signalÃ©s).
        </p>

        <h3 className="text-xl font-medium mt-4">7.4 Force majeure</h3>
        <p>
          Aucune des Parties ne pourra Ãªtre tenue responsable de la non-exÃ©cution ou des retards dans
          l&apos;exÃ©cution de ses obligations rÃ©sultant d&apos;un cas de force majeure au sens de
          l&apos;article 1218 du Code civil et de la jurisprudence des tribunaux franÃ§ais. La Partie
          invoquant la force majeure en informe l&apos;autre sans dÃ©lai.
        </p>
      </section>

      {/* ===== 8. ASSURANCES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 8 â€” Assurances</h2>

        <h3 className="text-xl font-medium mt-4">8.1 Assurance du Praticien</h3>
        <p>
          ConformÃ©ment Ã  l&apos;article L.1142-2 du Code de la santÃ© publique, le Praticien dÃ©clare Ãªtre
          couvert par une assurance de responsabilitÃ© civile professionnelle (RCP) en cours de validitÃ©
          pour l&apos;ensemble de ses activitÃ©s professionnelles, y compris les activitÃ©s de prÃ©vention et
          d&apos;information par voie numÃ©rique.
        </p>
        <p>
          Le Praticien s&apos;engage Ã  maintenir cette couverture pendant toute la durÃ©e du contrat et Ã 
          en justifier sur demande du Prestataire. Ã€ dÃ©faut de production de l&apos;attestation d&apos;assurance
          dans un dÃ©lai de 15 jours suivant la demande, le Prestataire pourra suspendre l&apos;accÃ¨s au service.
        </p>

        <h3 className="text-xl font-medium mt-4">8.2 Assurance du Prestataire</h3>
        <p>
          Le Prestataire dÃ©clare avoir souscrit une assurance de responsabilitÃ© civile professionnelle couvrant
          les risques liÃ©s Ã  l&apos;exploitation d&apos;une plateforme SaaS, notamment les risques de violation
          de donnÃ©es. Les rÃ©fÃ©rences de cette assurance seront communiquÃ©es au Praticien sur demande.
        </p>
      </section>

      {/* ===== 9. CONFIDENTIALITÃ‰ ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 9 â€” ConfidentialitÃ©</h2>
        <p>
          Chaque Partie s&apos;engage Ã  considÃ©rer comme confidentielle toute information, de quelque nature
          que ce soit (technique, commerciale, financiÃ¨re, stratÃ©gique), appartenant Ã  l&apos;autre Partie
          et dont elle aurait eu connaissance Ã  l&apos;occasion de l&apos;exÃ©cution du prÃ©sent contrat.
        </p>
        <p>
          Cette obligation de confidentialitÃ© subsiste pendant toute la durÃ©e du contrat et pour une pÃ©riode
          de trois (3) ans aprÃ¨s sa cessation. Elle ne s&apos;applique pas aux informations relevant du domaine
          public, dÃ©jÃ  connues de la Partie rÃ©ceptrice, ou dont la divulgation est imposÃ©e par la loi.
        </p>
        <p>
          Les donnÃ©es personnelles des patients sont soumises au secret professionnel tel que prÃ©vu par
          l&apos;article R.4127-206 du Code de la santÃ© publique, et ne sont pas couvertes par la limitation
          de durÃ©e de trois ans : l&apos;obligation de confidentialitÃ© est perpÃ©tuelle.
        </p>
      </section>

      {/* ===== 10. DONNÃ‰ES PERSONNELLES RELATIVES AU PRATICIEN ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 10 â€” DonnÃ©es personnelles du Praticien</h2>
        <p>
          Dans le cadre de la relation contractuelle, le Prestataire collecte et traite des donnÃ©es personnelles
          relatives au Praticien (nom, adresse email professionnelle, donnÃ©es de paiement, coordonnÃ©es
          professionnelles). Ces traitements sont fondÃ©s sur l&apos;exÃ©cution du prÃ©sent contrat (art. 6.1.b
          RGPD) et sur les obligations lÃ©gales (art. 6.1.c RGPD) pour la facturation.
        </p>
        <p>
          Le Praticien dispose des droits prÃ©vus aux articles 15 Ã  22 du RGPD. L&apos;exercice de ces droits
          s&apos;effectue auprÃ¨s du DPO Ã  <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>.
          Les donnÃ©es du Praticien sont conservÃ©es pendant la durÃ©e du contrat, puis pour une durÃ©e de 5 ans
          Ã  compter de la fin du contrat pour les donnÃ©es comptables et de facturation (article L.123-22 du
          Code de commerce).
        </p>
      </section>

      {/* ===== 11. LOI APPLICABLE ET LITIGES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 11 â€” Loi applicable et rÃ¨glement des litiges</h2>

        <h3 className="text-xl font-medium mt-4">11.1 Droit applicable</h3>
        <p>
          Le prÃ©sent contrat est soumis au droit franÃ§ais. Les Parties conviennent que la Convention des
          Nations Unies sur les contrats de vente internationale de marchandises (CVIM) ne s&apos;applique pas.
        </p>

        <h3 className="text-xl font-medium mt-4">11.2 RÃ¨glement amiable</h3>
        <p>
          Les Parties s&apos;engagent Ã  rechercher une solution amiable avant toute action judiciaire. Toute
          contestation sera prÃ©alablement soumise Ã  une tentative de rÃ©solution amiable, par Ã©change de
          correspondances Ã©crites.
        </p>

        <h3 className="text-xl font-medium mt-4">11.3 Attribution de compÃ©tence</h3>
        <p>
          Ã€ dÃ©faut d&apos;accord amiable, tout litige relatif Ã  la validitÃ©, l&apos;interprÃ©tation,
          l&apos;exÃ©cution ou la rÃ©siliation du prÃ©sent contrat sera portÃ© devant les tribunaux compÃ©tents
          du ressort de Nantes (France), nonobstant pluralitÃ© de dÃ©fendeurs ou appel en garantie, y compris
          en matiÃ¨re de rÃ©fÃ©rÃ©.
        </p>

        <h3 className="text-xl font-medium mt-4">11.4 NullitÃ© partielle</h3>
        <p>
          Si une ou plusieurs stipulations du prÃ©sent contrat sont dÃ©clarÃ©es nulles, inapplicables ou non
          Ã©crites par une dÃ©cision de justice ou une autoritÃ© compÃ©tente, les autres stipulations demeureront
          en vigueur et continueront Ã  produire leurs effets. Les Parties substitueront aux clauses annulÃ©es
          des clauses valides et d&apos;effet Ã©conomique Ã©quivalent.
        </p>
      </section>

      {/* ===== 12. DISPOSITIONS DIVERSES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">Article 12 â€” Dispositions diverses</h2>

        <h3 className="text-xl font-medium mt-4">12.1 IntÃ©gralitÃ©</h3>
        <p>
          Le prÃ©sent contrat, incluant son Annexe 1 (DPA), constitue l&apos;intÃ©gralitÃ© de l&apos;accord entre
          les Parties et remplace tout accord, dÃ©claration ou engagement antÃ©rieur relatif au mÃªme objet.
        </p>

        <h3 className="text-xl font-medium mt-4">12.2 Modification</h3>
        <p>
          Le Prestataire se rÃ©serve le droit de modifier le prÃ©sent contrat pour prendre en compte les Ã©volutions
          lÃ©gales, rÃ©glementaires ou techniques. En cas de modification substantielle, le Praticien est informÃ©
          par email au moins 30 jours avant l&apos;entrÃ©e en vigueur. Le Praticien dispose de la facultÃ© de
          rÃ©silier sans frais si les modifications ne lui conviennent pas. L&apos;absence de rÃ©siliation dans
          ce dÃ©lai vaut acceptation.
        </p>

        <h3 className="text-xl font-medium mt-4">12.3 Cession</h3>
        <p>
          Le Praticien ne peut cÃ©der tout ou partie de ses droits et obligations au titre du prÃ©sent contrat
          sans l&apos;autorisation prÃ©alable Ã©crite du Prestataire. Le Prestataire peut cÃ©der le contrat Ã 
          tout tiers dans le cadre d&apos;une fusion, acquisition, cession de branche d&apos;activitÃ©, sous
          rÃ©serve d&apos;en informer le Praticien avec un prÃ©avis de 30 jours.
        </p>

        <h3 className="text-xl font-medium mt-4">12.4 Notification</h3>
        <p>
          Toute notification relative au prÃ©sent contrat est adressÃ©e par email avec accusÃ© de rÃ©ception :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Au Prestataire : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></li>
          <li>Au Praticien : Ã  l&apos;adresse email renseignÃ©e lors de la souscription.</li>
        </ul>
        <p className="mt-2">
          Les Parties s&apos;engagent Ã  tenir Ã  jour leurs coordonnÃ©es et Ã  notifier tout changement sans dÃ©lai.
        </p>
      </section>

      {/* ===== ANNEXE 1 : DPA ===== */}
      <section>
        <h2 className="text-2xl font-semibold border-t border-border pt-8 mt-12">
          Annexe 1 â€” Accord de Traitement des DonnÃ©es (DPA)
        </h2>

        <h3 className="text-xl font-medium mt-4">A1.1 Objet et champ d&apos;application</h3>
        <p>
          La prÃ©sente Annexe fait partie intÃ©grante du Contrat d&apos;abonnement et d&apos;utilisation de la
          Plateforme Sensident. Elle dÃ©finit les obligations respectives des Parties relatives au traitement
          des donnÃ©es Ã  caractÃ¨re personnel, conformÃ©ment Ã  l&apos;article 28 du RGPD.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.2 DÃ©finitions</h3>
        <p>
          Les termes utilisÃ©s dans la prÃ©sente Annexe ont la signification qui leur est attribuÃ©e par l&apos;article
          4 du RGPD. Les termes Â« responsable de traitement Â» et Â« sous-traitant Â» renvoient respectivement au
          Praticien et au Prestataire, tels que qualifiÃ©s Ã  l&apos;article 4.1 du prÃ©sent contrat.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.3 Description du traitement</h3>
        <p>
          <strong>Objet</strong> : fourniture de la Plateforme Sensident de prÃ©vention bucco-dentaire par
          newsletter.
        </p>
        <p>
          <strong>Nature du traitement</strong> : collecte, enregistrement, organisation, conservation,
          extraction, et destruction des donnÃ©es personnelles pour le compte du responsable de traitement.
        </p>
        <p>
          <strong>FinalitÃ©s</strong> : envoi de newsletters, mesure d&apos;audience, collecte de rÃ©actions,
          gestion des inscriptions et dÃ©sabonnements.
        </p>
        <p>
          <strong>CatÃ©gories de personnes concernÃ©es</strong> : patients du Praticien, utilisateurs de la
          Plateforme.
        </p>
        <p>
          <strong>CatÃ©gories de donnÃ©es</strong> : adresse email, nom, token d&apos;invitation, consentements
          (horodatage + choix), prÃ©fÃ©rences newsletter, donnÃ©es de heartbeat (timestamp, articleSlug, indicateur
          de visibilitÃ©), rÃ©actions (ðŸ‘ðŸ‘Ž, articleSlug).
        </p>
        <p>
          <strong>DurÃ©e du traitement</strong> : durÃ©e du contrat, puis suppression dans les conditions de
          l&apos;article 5.5.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.4 Obligations du sous-traitant (art. 28.3 RGPD)</h3>
        <p>Le Prestataire s&apos;engage Ã  :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>(a)</strong> Traiter les donnÃ©es personnelles exclusivement sur instructions documentÃ©es du
            responsable de traitement, y compris en ce qui concerne les transferts hors UE. Les instructions sont
            celles dÃ©finies au prÃ©sent contrat et au DPA. Toute instruction supplÃ©mentaire fera l&apos;objet
            d&apos;un avenant.
          </li>
          <li>
            <strong>(b)</strong> Veiller Ã  ce que les personnes autorisÃ©es Ã  traiter les donnÃ©es soient soumises
            Ã  une obligation de confidentialitÃ© appropriÃ©e, contractuelle ou lÃ©gale.
          </li>
          <li>
            <strong>(c)</strong> Mettre en Å“uvre les mesures techniques et organisationnelles dÃ©crites Ã 
            l&apos;article A1.5 pour garantir un niveau de sÃ©curitÃ© adaptÃ© au risque.
          </li>
          <li>
            <strong>(d)</strong> Respecter les conditions de recours Ã  des sous-traitants ultÃ©rieurs prÃ©vues
            Ã  l&apos;article A1.6.
          </li>
          <li>
            <strong>(e)</strong> Assister le responsable de traitement, dans la mesure du possible et par
            des mesures techniques et organisationnelles appropriÃ©es, pour rÃ©pondre aux demandes d&apos;exercice
            des droits des personnes concernÃ©es (art. 15 Ã  22 RGPD).
          </li>
          <li>
            <strong>(f)</strong> Assister le responsable de traitement pour le respect des obligations de
            sÃ©curitÃ© (art. 32 RGPD), de notification des violations (art. 33 RGPD), de communication des
            violations aux personnes concernÃ©es (art. 34 RGPD), et de rÃ©alisation d&apos;analyses d&apos;impact
            (art. 35 RGPD).
          </li>
          <li>
            <strong>(g)</strong> Supprimer ou restituer toutes les donnÃ©es personnelles, au choix du responsable
            de traitement, en fin de contrat, et supprimer les copies existantes, sauf obligation lÃ©gale de
            conservation.
          </li>
          <li>
            <strong>(h)</strong> Mettre Ã  disposition du responsable de traitement toutes les informations
            nÃ©cessaires pour dÃ©montrer le respect des obligations prÃ©vues Ã  l&apos;article 28 du RGPD, et
            faciliter les audits, inspections et contrÃ´les.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.5 Mesures techniques et organisationnelles (art. 32 RGPD)</h3>
        <p>
          Le Prestataire met en Å“uvre les mesures suivantes :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Pseudonymisation et anonymisation</strong> : agrÃ©gation des donnÃ©es avec seuil minimum de 5 patients avant affichage au Praticien.</li>
          <li><strong>Chiffrement en transit</strong> : TLS 1.3 pour l&apos;ensemble des communications.</li>
          <li><strong>Chiffrement au repos</strong> : chiffrement AES-256 de la base de donnÃ©es.</li>
          <li><strong>SÃ©curitÃ© de la base de donnÃ©es</strong> : Row-Level Security (RLS) PostgreSQL assurant l&apos;isolation des donnÃ©es par Praticien.</li>
          <li><strong>ContrÃ´le d&apos;accÃ¨s</strong> : authentification forte, politique de moindre privilÃ¨ge, accÃ¨s aux donnÃ©es limitÃ© au personnel autorisÃ©.</li>
          <li><strong>Journalisation</strong> : audit logs des accÃ¨s et opÃ©rations, conservation 5 ans.</li>
          <li><strong>Sauvegarde</strong> : sauvegardes quotidiennes chiffrÃ©es, rÃ©tention 30 jours.</li>
          <li><strong>ContinuitÃ© d&apos;activitÃ©</strong> : plan de reprise d&apos;activitÃ© (PRA) avec objectif de restauration sous 24 heures.</li>
          <li><strong>Mises Ã  jour</strong> : application des correctifs de sÃ©curitÃ© dans les 7 jours suivant leur publication.</li>
          <li><strong>Sensibilisation</strong> : formation du personnel habilitÃ© aux bonnes pratiques RGPD et sÃ©curitÃ©.</li>
          <li><strong>HÃ©bergement HDS</strong> : certification HDS de l&apos;hÃ©bergeur (migration en cours), conformÃ©ment aux articles L.1111-8 et R.1111-9 et suivants du Code de la santÃ© publique.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.6 Sous-traitants ultÃ©rieurs (art. 28.2 et 28.4 RGPD)</h3>
        <p>
          Le Prestataire ne recourt Ã  un sous-traitant ultÃ©rieur qu&apos;avec l&apos;autorisation gÃ©nÃ©rale
          Ã©crite du responsable de traitement. Cette autorisation est rÃ©putÃ©e accordÃ©e pour les sous-traitants
          listÃ©s Ã  l&apos;article 4.4 du contrat.
        </p>
        <p>
          En cas d&apos;ajout ou de remplacement d&apos;un sous-traitant ultÃ©rieur, le Prestataire informe le
          responsable de traitement par email, en prÃ©cisant le nom, l&apos;adresse et la nature des traitements
          confiÃ©s. Le responsable de traitement dispose d&apos;un dÃ©lai de 30 jours pour Ã©mettre des objections
          motivÃ©es. En l&apos;absence d&apos;objection, le recours est rÃ©putÃ© acceptÃ©.
        </p>
        <p>
          Le Prestataire impose contractuellement Ã  ses sous-traitants ultÃ©rieurs des obligations de protection
          des donnÃ©es au moins Ã©quivalentes Ã  celles du prÃ©sent DPA, conformÃ©ment Ã  l&apos;article 28.4 du RGPD.
          Le Prestataire demeure pleinement responsable envers le responsable de traitement de l&apos;exÃ©cution
          par le sous-traitant ultÃ©rieur de ses obligations.
        </p>

        <h3 className="text-xl font-medium mt-4">A1.7 Violations de donnÃ©es (art. 33 et 34 RGPD)</h3>
        <p>
          En cas de violation de donnÃ©es Ã  caractÃ¨re personnel affectant les donnÃ©es traitÃ©es pour le compte
          du responsable de traitement, le Prestataire s&apos;engage Ã  :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Notifier le responsable de traitement dans les meilleurs dÃ©lais, et au plus tard 24 heures aprÃ¨s en avoir pris connaissance ;</li>
          <li>Fournir toutes les informations requises par l&apos;article 33.3 du RGPD (nature de la violation, catÃ©gories et nombre de personnes concernÃ©es, consÃ©quences probables, mesures prises ou envisagÃ©es) ;</li>
          <li>CoopÃ©rer avec le responsable de traitement pour la notification Ã  la CNIL dans le dÃ©lai de 72 heures prÃ©vu Ã  l&apos;article 33 du RGPD ;</li>
          <li>Prendre toutes les mesures nÃ©cessaires pour limiter les consÃ©quences de la violation et prÃ©venir sa rÃ©pÃ©tition.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">A1.8 Audit</h3>
        <p>
          Le responsable de traitement, ou un auditeur indÃ©pendant mandatÃ© par lui et soumis Ã  une obligation
          de confidentialitÃ©, peut procÃ©der Ã  un audit des mesures techniques et organisationnelles mises en
          Å“uvre par le Prestataire, dans la limite d&apos;un audit par annÃ©e civile, sauf circonstances
          particuliÃ¨res (violation de donnÃ©es, suspicion de non-conformitÃ©).
        </p>
        <p>
          L&apos;audit est rÃ©alisÃ© aux frais du responsable de traitement, aprÃ¨s notification Ã©crite avec un
          prÃ©avis d&apos;au moins 30 jours, pendant les heures ouvrÃ©es et sans perturber le fonctionnement du
          service. Le Prestataire s&apos;engage Ã  fournir les informations nÃ©cessaires et Ã  coopÃ©rer de bonne
          foi. L&apos;audit peut Ã©galement Ãªtre satisfait par la fourniture d&apos;une certification ou d&apos;un
          rapport d&apos;audit externe rÃ©cent (datant de moins de 12 mois).
        </p>

        <h3 className="text-xl font-medium mt-4">A1.9 Obligations du responsable de traitement</h3>
        <p>
          Le Praticien, en qualitÃ© de responsable de traitement, s&apos;engage Ã  :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Collecter les donnÃ©es personnelles de ses patients de maniÃ¨re licite, loyale et transparente ;</li>
          <li>Informer ses patients des traitements mis en Å“uvre et de leurs droits ;</li>
          <li>Recueillir les consentements nÃ©cessaires, le cas Ã©chÃ©ant ;</li>
          <li>Respecter les droits des personnes concernÃ©es et rÃ©pondre Ã  leurs demandes ;</li>
          <li>S&apos;assurer que les instructions donnÃ©es au sous-traitant sont conformes au RGPD ;</li>
          <li>Tenir un registre des activitÃ©s de traitement (art. 30 RGPD).</li>
        </ul>
      </section>
    </main>
  );
}

// Wrapper Next.js : injecte le shell + auth check praticien (dÃ©jÃ  gÃ©rÃ© par dashboard/layout.tsx)
export default function ContratPraticienPage() {
  return <ContratPraticienContent />;
}
