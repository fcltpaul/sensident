export default function CguPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-muted-foreground">
        Dernière mise à jour : 11 juin 2026
      </p>

      {/* ===== 1. PRÉAMBULE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">1. Préambule</h2>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir
          les modalités d&apos;accès et d&apos;utilisation de la plateforme Sensident (ci-après la « Plateforme »),
          éditée par Paul Foucault, entrepreneur individuel ou société en cours d&apos;immatriculation (ci-après
          « Sensident »).
        </p>
        <p>
          La Plateforme est un service de prévention bucco-dentaire par newsletter proposé par un cabinet dentaire
          à ses patients. Le praticien abonné (ci-après le « Praticien ») met à disposition de ses patients
          (ci-après l&apos;« Utilisateur » ou « vous ») des contenus informatifs relatifs à la santé bucco-dentaire,
          hébergés et diffusés via la Plateforme.
        </p>
        <p>
          L&apos;accès et l&apos;utilisation de la Plateforme sont subordonnés à l&apos;acceptation sans réserve
          des présentes CGU. En vous inscrivant, vous reconnaissez avoir pris connaissance des CGU et les accepter.
          Sensident se réserve le droit de modifier les CGU à tout moment. Les modifications prendront effet dès
          leur publication. Il vous est conseillé de consulter régulièrement cette page.
        </p>
      </section>

      {/* ===== 2. DÉFINITIONS ===== */}
      <section>
        <h2 className="text-2xl font-semibold">2. Définitions</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Plateforme</strong> : désigne le service numérique Sensident, accessible via le site web
            sensident.fr, comprenant l&apos;ensemble des fonctionnalités proposées (inscription, réception de
            newsletters, réactions, suivi de lecture).
          </li>
          <li>
            <strong>Contenu</strong> : désigne l&apos;ensemble des éléments publiés par le Praticien via la
            Plateforme, notamment les articles, newsletters, textes, images et autres éléments informatifs
            à destination des Utilisateurs.
          </li>
          <li>
            <strong>Utilisateur</strong> : désigne toute personne physique majeure, patient d&apos;un Praticien,
            qui s&apos;inscrit à la Plateforme pour recevoir les Contenus.
          </li>
          <li>
            <strong>Praticien</strong> : désigne le chirurgien-dentiste ou le cabinet dentaire, personne physique
            ou morale, abonné à la Plateforme, qui publie des Contenus et invite ses patients à s&apos;y abonner.
          </li>
          <li>
            <strong>Données</strong> : désigne l&apos;ensemble des informations à caractère personnel collectées
            dans le cadre de l&apos;utilisation de la Plateforme, telles que définies à l&apos;article 4 du
            Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679).
          </li>
        </ul>
      </section>

      {/* ===== 3. OBJET ET CONDITIONS D'ACCÈS ===== */}
      <section>
        <h2 className="text-2xl font-semibold">3. Objet et conditions d&apos;accès</h2>
        <h3 className="text-xl font-medium mt-4">3.1 Objet</h3>
        <p>
          Les présentes CGU ont pour objet de régir les relations contractuelles entre Sensident et l&apos;Utilisateur
          dans le cadre de la mise à disposition de la Plateforme. La Plateforme permet au Praticien de diffuser des
          newsletters d&apos;information et de prévention bucco-dentaire, et à l&apos;Utilisateur de les recevoir,
          d&apos;y réagir et de gérer ses préférences.
        </p>

        <h3 className="text-xl font-medium mt-4">3.2 Conditions d&apos;accès</h3>
        <p>
          L&apos;accès à la Plateforme est réservé aux personnes physiques majeures, invitées par un Praticien
          abonné. L&apos;accès suppose la possession d&apos;une adresse email valide et d&apos;un navigateur
          internet compatible. L&apos;accès à la Plateforme est gratuit pour l&apos;Utilisateur.
        </p>
        <p>
          Sensident met en œuvre les moyens techniques raisonnables pour assurer un accès continu à la Plateforme,
          sous réserve des opérations de maintenance et des cas de force majeure. Sensident ne saurait être tenue
          pour responsable des interruptions temporaires d&apos;accès.
        </p>

        <h3 className="text-xl font-medium mt-4">3.3 Évolution du service</h3>
        <p>
          Sensident se réserve le droit de faire évoluer la Plateforme, d&apos;en modifier les fonctionnalités
          ou d&apos;en suspendre l&apos;accès, sous réserve d&apos;en informer préalablement les Utilisateurs dans
          un délai raisonnable.
        </p>
      </section>

      {/* ===== 4. INSCRIPTION ===== */}
      <section>
        <h2 className="text-2xl font-semibold">4. Inscription</h2>
        <h3 className="text-xl font-medium mt-4">4.1 Procédure d&apos;inscription</h3>
        <p>
          L&apos;inscription s&apos;effectue via un formulaire dédié. L&apos;Utilisateur doit renseigner son nom
          et son adresse email, et indiquer le token d&apos;invitation remis par son Praticien. Ce token permet
          d&apos;associer l&apos;Utilisateur au cabinet dentaire correspondant.
        </p>

        <h3 className="text-xl font-medium mt-4">4.2 Double opt-in</h3>
        <p>
          Conformément aux exigences de la réglementation applicable et aux bonnes pratiques en matière de
          protection des données, l&apos;inscription est soumise à un mécanisme de double opt-in. Après
          soumission du formulaire, l&apos;Utilisateur reçoit un email de confirmation contenant un lien
          de validation. L&apos;inscription n&apos;est effective qu&apos;après clic sur ce lien de validation.
          À défaut de validation dans un délai de 7 jours, les données d&apos;inscription sont automatiquement
          supprimées.
        </p>
        <p>
          Ce mécanisme garantit que l&apos;adresse email renseignée appartient bien à l&apos;Utilisateur et
          que celui-ci a expressément consenti à l&apos;inscription. Un email de bienvenue confirmant
          l&apos;inscription est envoyé à l&apos;issue de la validation.
        </p>

        <h3 className="text-xl font-medium mt-4">4.3 Finalités du consentement</h3>
        <p>
          Lors de l&apos;inscription, l&apos;Utilisateur doit donner son consentement explicite pour chacune
          des trois finalités suivantes, de manière distincte :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Finalité 1 — Réception de la newsletter</strong> : réception des newsletters de prévention
            bucco-dentaire envoyées par le Praticien via la Plateforme.
          </li>
          <li>
            <strong>Finalité 2 — Mesure d&apos;audience</strong> : collecte de données de lecture (heartbeat) aux
            fins de mesure d&apos;audience et d&apos;amélioration du service.
          </li>
          <li>
            <strong>Finalité 3 — Réactions</strong> : collecte des réactions (👍 ou 👎) sur les articles afin
            de personnaliser le contenu futur.
          </li>
        </ul>
        <p>
          Chaque finalité fait l&apos;objet d&apos;une case à cocher distincte. L&apos;Utilisateur peut librement
          consentir à une, deux ou aux trois finalités. Le refus de consentir à la Finalité 1 empêche toute
          inscription. Le refus des Finalités 2 ou 3 n&apos;empêche pas l&apos;inscription mais limite les
          fonctionnalités correspondantes.
        </p>

        <h3 className="text-xl font-medium mt-4">4.4 Exactitude des informations</h3>
        <p>
          L&apos;Utilisateur s&apos;engage à fournir des informations exactes, à jour et complètes lors de
          son inscription. Il est responsable de la mise à jour de ses données en cas de changement.
        </p>
      </section>

      {/* ===== 5. DÉSABONNEMENT ===== */}
      <section>
        <h2 className="text-2xl font-semibold">5. Désabonnement</h2>
        <p>
          Conformément à l&apos;article L.121-35 du Code de la consommation et au principe de facilité de retrait
          du consentement posé par l&apos;article 7, paragraphe 3, du RGPD, l&apos;Utilisateur peut se désabonner
          à tout moment, en un clic, sans frais et sans justification.
        </p>
        <p>
          Un lien de désabonnement est présent dans chaque newsletter envoyée. L&apos;Utilisateur peut également
          se désabonner en accédant à son espace de gestion des préférences sur la Plateforme, ou en envoyant
          un email à <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a>.
        </p>
        <p>
          Le désabonnement entraîne la cessation immédiate de tout traitement des Données de l&apos;Utilisateur
          pour les finalités liées à la Plateforme. Les Données sont supprimées dans les conditions prévues par
          la Politique de confidentialité.
        </p>
      </section>

      {/* ===== 6. PROPRIÉTÉ INTELLECTUELLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">6. Propriété intellectuelle</h2>
        <h3 className="text-xl font-medium mt-4">6.1 Contenus de Sensident</h3>
        <p>
          La Plateforme, sa charte graphique, son code source, ses logos, marques et l&apos;ensemble des éléments
          qui la composent sont la propriété exclusive de Sensident et sont protégés par les dispositions du Code
          de la propriété intellectuelle (articles L.111-1 et suivants, L.122-1 et suivants). Toute reproduction,
          représentation, modification, adaptation, diffusion, totale ou partielle, est interdite sans autorisation
          préalable expresse de Sensident.
        </p>

        <h3 className="text-xl font-medium mt-4">6.2 Contenus des articles</h3>
        <p>
          Les articles de prévention publiés par les Praticiens sont la propriété intellectuelle de leurs auteurs
          respectifs. Sensident bénéficie d&apos;une licence d&apos;usage, de reproduction et de diffusion sur ces
          contenus aux fins exclusives de fonctionnement de la Plateforme.
        </p>

        <h3 className="text-xl font-medium mt-4">6.3 Licence d&apos;usage concédée à l&apos;Utilisateur</h3>
        <p>
          Sensident concède à l&apos;Utilisateur une licence d&apos;usage personnelle, non exclusive, non
          cessible et révocable de la Plateforme, pour un usage strictement privé et conforme aux présentes
          CGU. L&apos;Utilisateur s&apos;interdit notamment de reproduire, diffuser ou exploiter les Contenus
          à des fins commerciales.
        </p>
      </section>

      {/* ===== 7. RESPONSABILITÉ ===== */}
      <section>
        <h2 className="text-2xl font-semibold">7. Responsabilité</h2>
        <h3 className="text-xl font-medium mt-4">7.1 Rôle de Sensident</h3>
        <p>
          Sensident agit en qualité d&apos;hébergeur technique au sens de l&apos;article 6.I.2 de la loi n° 2004-575
          du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN). À ce titre, Sensident ne
          contrôle pas a priori les Contenus publiés par les Praticiens. Sensident ne saurait voir sa
          responsabilité engagée du fait des Contenus publiés par le Praticien, sauf dans les conditions prévues
          par les articles 6.I.2 et 6.I.3 de la LCEN.
        </p>
        <p>
          Conformément à l&apos;article 6.I.5 de la LCEN, Sensident met en place un dispositif de signalement
          permettant à toute personne de porter à sa connaissance des contenus manifestement illicites.
        </p>

        <h3 className="text-xl font-medium mt-4">7.2 Contenus publiés par le Praticien</h3>
        <p>
          Le Praticien est seul responsable des Contenus qu&apos;il publie via la Plateforme. Il garantit
          que ces Contenus sont conformes aux lois et règlements en vigueur, qu&apos;ils ne portent pas
          atteinte aux droits de tiers, et qu&apos;ils ne contiennent pas d&apos;informations médicales
          erronées ou trompeuses. Le Praticien est notamment responsable du respect des règles déontologiques
          applicables à la profession de chirurgien-dentiste, telles que prévues par le Code de la santé
          publique (articles R.4127-201 et suivants) et le Code de déontologie des chirurgiens-dentistes.
        </p>

        <h3 className="text-xl font-medium mt-4">7.3 Limitation de responsabilité</h3>
        <p>
          La Plateforme fournit des informations à caractère général de prévention bucco-dentaire. Ces
          informations ne constituent en aucun cas un avis médical personnalisé, un diagnostic ou une
          prescription. En cas de symptômes ou de question médicale, l&apos;Utilisateur doit consulter
          son praticien.
        </p>
        <p>
          Sensident met en œuvre les moyens appropriés pour assurer la sécurité et la disponibilité de la
          Plateforme. Toutefois, sa responsabilité ne peut être engagée en cas de dommage résultant d&apos;une
          utilisation non conforme de la Plateforme, d&apos;un cas de force majeure au sens de l&apos;article
          1218 du Code civil, ou du fait d&apos;un tiers.
        </p>

        <h3 className="text-xl font-medium mt-4">7.4 Obligations de l&apos;Utilisateur</h3>
        <p>
          L&apos;Utilisateur s&apos;engage à utiliser la Plateforme conformément aux présentes CGU et aux
          lois en vigueur. Il s&apos;interdit notamment d&apos;utiliser la Plateforme à des fins illicites,
          frauduleuses ou susceptibles de porter atteinte à la sécurité ou à l&apos;intégrité du service.
        </p>
      </section>

      {/* ===== 8. DONNÉES PERSONNELLES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">8. Données personnelles</h2>
        <p>
          Sensident collecte et traite les Données personnelles des Utilisateurs conformément au Règlement
          Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi n° 78-17 du
          6 janvier 1978 modifiée, dite loi Informatique et Libertés.
        </p>
        <p>
          Les modalités détaillées de collecte, de traitement et d&apos;exercice des droits sont exposées
          dans la <a href="/politique-confidentialite" className="underline text-primary">Politique de confidentialité</a>,
          accessible à tout moment sur la Plateforme. L&apos;Utilisateur est invité à en prendre connaissance
          avant toute inscription.
        </p>
      </section>

      {/* ===== 9. LOI APPLICABLE ET LITIGES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">9. Loi applicable et règlement des litiges</h2>
        <h3 className="text-xl font-medium mt-4">9.1 Droit applicable</h3>
        <p>
          Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation,
          leur validité, leur exécution ou leur cessation sera régi par le droit français.
        </p>

        <h3 className="text-xl font-medium mt-4">9.2 Règlement amiable</h3>
        <p>
          En cas de litige, les parties s&apos;engagent à rechercher une solution amiable avant toute action
          judiciaire. L&apos;Utilisateur peut adresser toute réclamation à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>.
          Sensident s&apos;engage à accuser réception et à répondre dans un délai de 30 jours.
        </p>

        <h3 className="text-xl font-medium mt-4">9.3 Compétence juridictionnelle</h3>
        <p>
          À défaut d&apos;accord amiable, tout litige sera porté devant les tribunaux compétents du ressort
          de Nantes (France), nonobstant pluralité de défendeurs ou appel en garantie. L&apos;Utilisateur
          bénéficie également de la faculté de saisir la juridiction de son domicile, conformément aux
          règles de compétence du Code de procédure civile.
        </p>

        <h3 className="text-xl font-medium mt-4">9.4 Nullité partielle</h3>
        <p>
          Si une ou plusieurs stipulations des présentes CGU sont déclarées nulles ou inapplicables par une
          décision de justice, les autres stipulations demeureront en vigueur et continueront à produire
          tous leurs effets. Les parties s&apos;engagent à substituer aux clauses annulées des clauses
          valides et d&apos;effet économique équivalent.
        </p>
      </section>
    </main>
  );
}
