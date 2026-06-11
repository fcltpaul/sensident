export default function PolitiqueConfidentialitePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
      <p className="text-muted-foreground">
        Dernière mise à jour : 11 juin 2026
      </p>

      {/* ===== 1. PRÉAMBULE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">1. Préambule</h2>
        <p>
          La présente Politique de confidentialité a pour objet d&apos;informer les utilisateurs de la plateforme
          Sensident (ci-après la « Plateforme ») des modalités de collecte, de traitement et d&apos;exercice de
          leurs droits concernant leurs données à caractère personnel, conformément au Règlement Général sur la
          Protection des Données (RGPD — Règlement UE 2016/679 du 27 avril 2016) et à la loi n° 78-17 du 6 janvier
          1978 modifiée, dite loi Informatique et Libertés.
        </p>
        <p>
          Sensident s&apos;engage à traiter vos données personnelles de manière licite, loyale et transparente,
          conformément à l&apos;article 5 du RGPD. Les termes utilisés dans la présente politique renvoient aux
          définitions de l&apos;article 4 du RGPD.
        </p>
      </section>

      {/* ===== 2. IDENTITÉ DU RESPONSABLE DE TRAITEMENT ===== */}
      <section>
        <h2 className="text-2xl font-semibold">2. Identité du responsable de traitement</h2>
        <p>
          Le responsable de traitement, au sens de l&apos;article 4.7 du RGPD, est :
        </p>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>Paul Foucault</strong>, exploitant la plateforme Sensident</p>
          <p>Entrepreneur individuel ou SAS en cours d&apos;immatriculation</p>
          <p>Adresse : à communiquer lors de l&apos;immatriculation</p>
          <p>Email : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></p>
        </div>
        <p className="mt-2">
          Le numéro SIREN sera communiqué dès son attribution par l&apos;INSEE et sera mis à jour sur les
          <a href="/mentions-legales" className="underline text-primary"> Mentions légales</a> de la Plateforme.
        </p>
      </section>

      {/* ===== 3. DÉLÉGUÉ À LA PROTECTION DES DONNÉES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">3. Délégué à la protection des données (DPO)</h2>
        <p>
          Conformément aux articles 37 à 39 du RGPD, Sensident a désigné un Délégué à la Protection des Données
          (DPO) :
        </p>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>Paul Foucault</strong></p>
          <p>Email : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></p>
        </div>
        <p className="mt-2">
          Le DPO est votre interlocuteur privilégié pour toute question relative à la protection de vos données
          personnelles et pour l&apos;exercice de vos droits.
        </p>
      </section>

      {/* ===== 4. DONNÉES COLLECTÉES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">4. Données collectées</h2>

        <h3 className="text-xl font-medium mt-4">4.1 Données d&apos;inscription</h3>
        <p>
          Lors de votre inscription via le formulaire dédié, les données suivantes sont collectées :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Adresse email</strong> : nécessaire à l&apos;envoi des newsletters et à la gestion de votre compte.</li>
          <li><strong>Nom</strong> : prénom ou nom d&apos;usage, utilisé pour personnaliser les communications.</li>
          <li><strong>Token d&apos;invitation</strong> : identifiant unique fourni par votre praticien, permettant de vous rattacher au cabinet dentaire correspondant.</li>
          <li><strong>Consentements</strong> : enregistrement de vos choix pour chacune des trois finalités (newsletter, mesure d&apos;audience, réactions), avec horodatage et empreinte technique du formulaire, conformément à l&apos;article 7.1 du RGPD.</li>
          <li><strong>Préférences newsletter</strong> : fréquence, centres d&apos;intérêt éventuels.</li>
        </ul>

        <h3 className="text-xl font-medium mt-4">4.2 Données de mesure d&apos;audience (heartbeat)</h3>
        <p>
          Si vous avez consenti à la Finalité 2 (mesure d&apos;audience), les données suivantes sont collectées
          via un script JavaScript léger (heartbeat) :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Timestamp</strong> : horodatage de l&apos;événement de lecture.</li>
          <li><strong>ArticleSlug</strong> : identifiant de l&apos;article consulté.</li>
          <li><strong>Indicateur de visibilité</strong> : confirmation que le bouton de l&apos;article était visible dans le viewport au moment de l&apos;enregistrement.</li>
        </ul>
        <p>
          Ces données permettent exclusivement de mesurer l&apos;audience agrégée des articles et d&apos;améliorer
          la pertinence du service. Aucune donnée de navigation externe, ni cookie de tracking tiers, ni profilage
          individuel n&apos;est mis en œuvre.
        </p>

        <h3 className="text-xl font-medium mt-4">4.3 Données de réactions</h3>
        <p>
          Si vous avez consenti à la Finalité 3 (réactions), les données suivantes sont collectées :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Réaction</strong> : 👍 (apprécié) ou 👎 (non apprécié).</li>
          <li><strong>ArticleSlug</strong> : identifiant de l&apos;article concerné.</li>
        </ul>
        <p>
          Les réactions permettent au Praticien d&apos;avoir un retour qualitatif agrégé sur ses contenus.
          Les données individuelles de réaction ne sont accessibles au Praticien qu&apos;après agrégation
          d&apos;au minimum cinq (5) patients distincts, garantissant ainsi votre anonymat dans les tableaux de bord.
        </p>

        <h3 className="text-xl font-medium mt-4">4.4 Données techniques</h3>
        <p>
          La Plateforme utilise un cookie de session essentiel au fonctionnement de Next.js. Ce cookie est
          strictement nécessaire à la fourniture du service et ne nécessite pas de consentement préalable
          conformément à l&apos;article 82 de la loi Informatique et Libertés et à la délibération CNIL
          n° 2020-091 du 17 septembre 2020. Aucun cookie tiers, cookie publicitaire ou cookie de tracking
          n&apos;est déposé sur votre terminal.
        </p>
        <p>
          Les journaux techniques de connexion (logs serveur) sont conservés pour une durée de 5 ans à des fins
          de sécurité et de diagnostic, conformément aux obligations de l&apos;article 32 du RGPD.
        </p>
      </section>

      {/* ===== 5. FINALITÉS ET BASES LÉGALES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">5. Finalités et bases légales du traitement</h2>

        <h3 className="text-xl font-medium mt-4">5.1 Tableau des finalités</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-3 text-left">Finalité</th>
                <th className="border border-border p-3 text-left">Base légale</th>
                <th className="border border-border p-3 text-left">Données concernées</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-3">Finalité 1 : Envoi de newsletters de prévention bucco-dentaire</td>
                <td className="border border-border p-3">
                  Consentement (art. 6.1.a RGPD)<br />
                  <span className="text-muted-foreground text-xs">Retrait possible à tout moment</span>
                </td>
                <td className="border border-border p-3">Email, nom, préférences newsletter</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Finalité 2 : Mesure d&apos;audience des articles</td>
                <td className="border border-border p-3">
                  Consentement (art. 6.1.a RGPD)<br />
                  <span className="text-muted-foreground text-xs">Retrait possible à tout moment</span>
                </td>
                <td className="border border-border p-3">Timestamp, articleSlug, indicateur de visibilité</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Finalité 3 : Collecte des réactions</td>
                <td className="border border-border p-3">
                  Consentement (art. 6.1.a RGPD)<br />
                  <span className="text-muted-foreground text-xs">Retrait possible à tout moment</span>
                </td>
                <td className="border border-border p-3">Réaction (👍👎), articleSlug</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Gestion des inscriptions, double opt-in, désabonnements</td>
                <td className="border border-border p-3">
                  Exécution du contrat (art. 6.1.b RGPD)
                </td>
                <td className="border border-border p-3">Email, nom, token, consentements</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Sécurité, détection d&apos;incidents, logs techniques</td>
                <td className="border border-border p-3">
                  Intérêt légitime (art. 6.1.f RGPD) — sécurité des systèmes
                </td>
                <td className="border border-border p-3">Logs de connexion et d&apos;accès</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Conservation des preuves de consentement</td>
                <td className="border border-border p-3">
                  Obligation légale (art. 6.1.c RGPD) — art. 7.1 RGPD
                </td>
                <td className="border border-border p-3">Horodatage, IP masquée, choix de consentement</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-medium mt-6">5.2 Précisions sur les bases légales</h3>
        <p>
          <strong>Consentement (art. 6.1.a RGPD)</strong> : Votre consentement est recueilli pour les Finalités
          1, 2 et 3, de manière distincte, libre, spécifique, éclairée et univoque, conformément à l&apos;article
          4.11 du RGPD. Vous pouvez retirer votre consentement à tout moment, sans porter atteinte à la licéité
          du traitement antérieur. Le retrait s&apos;effectue via le lien de désabonnement présent dans chaque
          newsletter, via votre espace de gestion des préférences, ou par email à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>.
        </p>
        <p>
          <strong>Exécution du contrat (art. 6.1.b RGPD)</strong> : Les traitements nécessaires à la gestion de
          votre inscription, à la validation du double opt-in et à la gestion des désabonnements sont fondés sur
          l&apos;exécution des CGU auxquelles vous adhérez lors de votre inscription.
        </p>
        <p>
          <strong>Intérêt légitime (art. 6.1.f RGPD)</strong> : Les traitements de logs techniques à des fins de
          sécurité reposent sur l&apos;intérêt légitime de Sensident à assurer la sécurité de ses systèmes
          d&apos;information, conformément à l&apos;article 32 du RGPD. Une mise en balance a été réalisée
          et ces traitements sont strictement proportionnés à cette finalité.
        </p>
      </section>

      {/* ===== 6. DESTINATAIRES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">6. Destinataires des données</h2>
        <p>
          Conformément à l&apos;article 28 du RGPD, les données personnelles sont accessibles aux destinataires
          suivants, dans la stricte limite de leurs attributions respectives :
        </p>

        <h3 className="text-xl font-medium mt-4">6.1 Sous-traitants</h3>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            <strong>Brevo (anciennement Sendinblue)</strong> — sis 106 boulevard Haussmann, 75008 Paris, France :
            prestataire d&apos;envoi d&apos;emails transactionnels (double opt-in, désabonnement) et de campagnes
            (newsletters). Les données traitées sont l&apos;adresse email, le nom, et les préférences de communication.
            Brevo agit en qualité de sous-traitant au sens de l&apos;article 28 du RGPD. Les serveurs de Brevo sont
            situés en Europe (Allemagne), assurant un niveau de protection adéquat. Un accord de traitement de données
            (DPA) conforme à l&apos;article 28.3 du RGPD est en vigueur.
          </li>
          <li>
            <strong>Hébergeur certifié HDS (Hébergement des Données de Santé)</strong> — nom à confirmer, France :
            la base de données est hébergée sur Neon (AWS Europe Central, Francfort). La migration vers un hébergeur
            certifié HDS est en cours. Les données de consentement sont conservées chez cet hébergeur. Un DPA
            conforme à l&apos;article 28.3 du RGPD sera en vigueur.
          </li>
          <li>
            <strong>Stripe, Inc.</strong> — sis 354 Oyster Point Blvd, South San Francisco, CA 94080, États-Unis :
            prestataire de services de paiement pour les abonnements des Praticiens. Stripe ne traite pas les
            données personnelles des Utilisateurs (patients), mais uniquement les données de paiement des
            Praticiens. Stripe bénéficie des clauses contractuelles types (CCT) de la Commission européenne
            (décision d&apos;exécution 2021/914 du 4 juin 2021) garantissant un niveau de protection adéquat
            pour les transferts de données vers les États-Unis.
          </li>
        </ul>

        <h3 className="text-xl font-medium mt-4">6.2 Praticien</h3>
        <p>
          Le Praticien auquel vous êtes rattaché a accès aux données agrégées et anonymisées de son audience
          (statistiques de lecture, réactions avec seuil minimum de 5 patients). Le Praticien n&apos;a pas accès
          à vos données individuelles de lecture ou de réaction. Il peut accéder à votre adresse email et votre
          nom pour la gestion de votre abonnement, en qualité de responsable conjoint du traitement.
        </p>

        <h3 className="text-xl font-medium mt-4">6.3 Communication à des tiers</h3>
        <p>
          Sensident s&apos;engage à ne jamais vendre, louer ou céder vos données personnelles à des tiers
          à des fins commerciales ou publicitaires. Aucune communication à des autorités publiques ne sera
          effectuée sans cadre légal approprié (réquisition judiciaire, obligation légale).
        </p>
      </section>

      {/* ===== 7. TRANSFERTS HORS UE ===== */}
      <section>
        <h2 className="text-2xl font-semibold">7. Transferts de données hors de l&apos;Union européenne</h2>
        <p>
          Conformément au chapitre V du RGPD (articles 44 à 49), Sensident vous informe des transferts de
          données suivants :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Brevo (Allemagne)</strong> : les données nécessaires à l&apos;envoi des emails (adresse email,
            nom) sont hébergées sur des serveurs situés en Allemagne, au sein de l&apos;Union européenne. Aucun
            transfert hors UE n&apos;est effectué pour ce traitement.
          </li>
          <li>
            <strong>Stripe (États-Unis)</strong> : Stripe ne traite pas les données des Utilisateurs (patients).
            Pour les données des Praticiens (paiement), le transfert est encadré par les Clauses Contractuelles
            Types (CCT) de la Commission européenne, décision d&apos;exécution 2021/914 du 4 juin 2021, complétées
            par des mesures techniques et organisationnelles supplémentaires (chiffrement, audit).
          </li>
          <li>
            <strong>Neon (AWS Europe Central, Francfort)</strong> : les données sont hébergées au sein de l&apos;Union
            européenne (Allemagne, région AWS eu-central-1). La migration vers un hébergeur certifié HDS en France
            est en cours.
          </li>
        </ul>
        <p>
          Pour toute question relative aux garanties encadrant ces transferts, vous pouvez contacter le DPO à
          <a href="mailto:dpo@sensident.fr" className="underline text-primary"> dpo@sensident.fr</a>.
        </p>
      </section>

      {/* ===== 8. DURÉE DE CONSERVATION ===== */}
      <section>
        <h2 className="text-2xl font-semibold">8. Durée de conservation des données</h2>
        <p>
          Conformément à l&apos;article 5.1.e du RGPD (principe de limitation de la conservation), les données
          sont conservées pour une durée n&apos;excédant pas celle nécessaire aux finalités pour lesquelles
          elles sont traitées :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-3 text-left">Catégorie de données</th>
                <th className="border border-border p-3 text-left">Durée de conservation en base active</th>
                <th className="border border-border p-3 text-left">Sort du traitement à l&apos;issue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-3">Données d&apos;inscription (email, nom, préférences)</td>
                <td className="border border-border p-3">Durée de la relation contractuelle + 3 ans à compter du dernier contact</td>
                <td className="border border-border p-3">Suppression définitive</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Données de heartbeat (lecture)</td>
                <td className="border border-border p-3">12 mois à compter de la collecte</td>
                <td className="border border-border p-3">Suppression automatique après 12 mois</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Données de réactions (👍👎)</td>
                <td className="border border-border p-3">Durée de la relation contractuelle + 3 ans</td>
                <td className="border border-border p-3">Suppression ou anonymisation</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Preuves de consentement (horodatage, choix)</td>
                <td className="border border-border p-3">Durée de la relation contractuelle + 5 ans (prescription légale)</td>
                <td className="border border-border p-3">Suppression définitive</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Logs techniques (connexion, sécurité)</td>
                <td className="border border-border p-3">5 ans (conservation probatoire)</td>
                <td className="border border-border p-3">Suppression définitive</td>
              </tr>
              <tr>
                <td className="border border-border p-3">Données d&apos;inscription non validée (double opt-in expiré)</td>
                <td className="border border-border p-3">7 jours</td>
                <td className="border border-border p-3">Suppression automatique</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== 9. DROITS DES PERSONNES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">9. Droits des personnes concernées</h2>
        <p>
          Conformément aux articles 15 à 22 du RGPD et aux articles 48 à 53 de la loi Informatique et Libertés,
          vous disposez des droits suivants sur vos données personnelles :
        </p>

        <h3 className="text-xl font-medium mt-4">9.1 Droit d&apos;accès (art. 15 RGPD)</h3>
        <p>
          Vous pouvez obtenir la confirmation que vos données sont traitées ou non, et accéder à l&apos;ensemble
          des données vous concernant détenues par Sensident, accompagnées des informations prévues par
          l&apos;article 15.1 (a à h) du RGPD (finalités, catégories, destinataires, durée de conservation, etc.).
        </p>

        <h3 className="text-xl font-medium mt-4">9.2 Droit de rectification (art. 16 RGPD)</h3>
        <p>
          Vous pouvez demander la rectification de vos données personnelles si elles sont inexactes ou incomplètes.
          Vous pouvez également mettre à jour vos informations directement via votre espace de gestion des
          préférences.
        </p>

        <h3 className="text-xl font-medium mt-4">9.3 Droit à l&apos;effacement — « droit à l&apos;oubli » (art. 17 RGPD)</h3>
        <p>
          Vous pouvez demander la suppression de vos données personnelles dans les cas prévus par l&apos;article
          17.1 du RGPD, notamment : si les données ne sont plus nécessaires, si vous retirez votre consentement,
          si vous vous opposez au traitement, ou si le traitement est illicite. Ce droit s&apos;exerce dans les
          limites prévues par l&apos;article 17.3 du RGPD (obligations légales de conservation notamment).
        </p>

        <h3 className="text-xl font-medium mt-4">9.4 Droit à la limitation du traitement (art. 18 RGPD)</h3>
        <p>
          Vous pouvez demander la limitation du traitement dans les cas prévus par l&apos;article 18.1 du RGPD :
          contestation de l&apos;exactitude, traitement illicite avec opposition à l&apos;effacement, constatation
          ou exercice de droits en justice.
        </p>

        <h3 className="text-xl font-medium mt-4">9.5 Droit d&apos;opposition (art. 21 RGPD)</h3>
        <p>
          Vous pouvez vous opposer à tout moment au traitement de vos données fondé sur l&apos;intérêt légitime
          (art. 6.1.f RGPD), pour des raisons tenant à votre situation particulière. Pour les traitements fondés
          sur le consentement (art. 6.1.a RGPD), le retrait du consentement produit les mêmes effets. Le droit
          d&apos;opposition s&apos;exerce notamment via le lien de désabonnement présent dans chaque newsletter.
        </p>

        <h3 className="text-xl font-medium mt-4">9.6 Droit à la portabilité (art. 20 RGPD)</h3>
        <p>
          Vous pouvez recevoir les données que vous avez fournies, dans un format structuré, couramment utilisé
          et lisible par machine (JSON ou CSV), et les transmettre à un autre responsable de traitement. Ce droit
          s&apos;applique aux traitements fondés sur le consentement (art. 6.1.a) ou l&apos;exécution d&apos;un
          contrat (art. 6.1.b), et effectués par des moyens automatisés.
        </p>

        <h3 className="text-xl font-medium mt-4">9.7 Droit de définir des directives post-mortem (art. 85 loi Informatique et Libertés)</h3>
        <p>
          Vous pouvez définir des directives relatives à la conservation, à l&apos;effacement et à la communication
          de vos données personnelles après votre décès. Ces directives peuvent être enregistrées auprès d&apos;un
          tiers de confiance certifié par la CNIL ou directement auprès de Sensident.
        </p>
      </section>

      {/* ===== 10. EXERCICE DES DROITS ===== */}
      <section>
        <h2 className="text-2xl font-semibold">10. Modalités d&apos;exercice des droits</h2>
        <p>
          Pour exercer vos droits, vous pouvez adresser votre demande :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Par email à : <a href="mailto:dpo@sensident.fr" className="underline text-primary">dpo@sensident.fr</a></li>
          <li>Via le formulaire de contact sur la Plateforme</li>
          <li>Via votre espace de gestion des préférences (désabonnement, modification)</li>
        </ul>
        <p>
          Conformément à l&apos;article 12.3 du RGPD, Sensident s&apos;engage à accuser réception de votre demande
          dans un délai de 72 heures ouvrées et à y répondre dans un délai maximal de 30 jours à compter de la
          réception de la demande complète. Ce délai peut être prolongé de deux mois en cas de complexité de la
          demande, conformément à l&apos;article 12.3 du RGPD. Vous serez informé de cette prolongation dans le
          mois suivant la réception de la demande.
        </p>
        <p>
          La demande doit être accompagnée d&apos;un justificatif d&apos;identité valide. Sensident pourra vous
          demander des informations complémentaires afin de confirmer votre identité, conformément à l&apos;article
          12.6 du RGPD.
        </p>
        <p>
          L&apos;exercice de vos droits est gratuit. Toutefois, en cas de demande manifestement infondée ou
          excessive, Sensident pourra exiger le paiement de frais raisonnables ou refuser de donner suite,
          conformément à l&apos;article 12.5 du RGPD.
        </p>
      </section>

      {/* ===== 11. SÉCURITÉ ===== */}
      <section>
        <h2 className="text-2xl font-semibold">11. Mesures de sécurité</h2>
        <p>
          Conformément à l&apos;article 32 du RGPD, Sensident met en œuvre les mesures techniques et
          organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque, notamment :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Chiffrement en transit</strong> : l&apos;intégralité des communications est chiffrée via
            TLS 1.3 (HTTPS), empêchant toute interception des données en transit entre votre navigateur et
            les serveurs de la Plateforme.
          </li>
          <li>
            <strong>Sécurité de la base de données</strong> : mise en œuvre du Row-Level Security (RLS) sur
            PostgreSQL, garantissant l&apos;isolation des données entre les différents Praticiens et empêchant
            tout accès non autorisé.
          </li>
          <li>
            <strong>Journalisation</strong> : audit logs complets des accès et opérations, permettant la
            détection et la traçabilité des incidents de sécurité.
          </li>
          <li>
            <strong>Agrégation des données</strong> : les données de réactions et de lecture présentées au
            Praticien sont agrégées avec un seuil minimum de 5 patients, garantissant l&apos;anonymat individuel
            dans les tableaux de bord.
          </li>
          <li>
            <strong>Contrôle d&apos;accès</strong> : accès aux données strictement limité aux personnes
            autorisées, avec authentification forte. Politique de moindre privilège.
          </li>
          <li>
            <strong>Sauvegardes</strong> : sauvegardes quotidiennes chiffrées avec rétention de 30 jours.
          </li>
          <li>
            <strong>Mises à jour</strong> : application régulière des correctifs de sécurité sur l&apos;ensemble
            de la stack technique.
          </li>
          <li>
            <strong>Hébergement</strong> : migration en cours vers un hébergeur certifié HDS (Hébergement des
            Données de Santé) conformément aux articles L.1111-8 et R.1111-9 et suivants du Code de la santé
            publique, garantissant des standards de sécurité renforcés pour les données de santé.
          </li>
        </ul>
      </section>

      {/* ===== 12. COOKIES ===== */}
      <section>
        <h2 className="text-2xl font-semibold">12. Cookies et traceurs</h2>
        <p>
          Conformément à l&apos;article 82 de la loi Informatique et Libertés et à la délibération CNIL
          n° 2020-091 du 17 septembre 2020, la Plateforme utilise exclusivement :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Cookie de session Next.js</strong> : cookie technique strictement nécessaire au fonctionnement
            de la Plateforme (maintien de session, sécurité CSRF). Ce cookie est exempté de consentement
            conformément aux lignes directrices de la CNIL. Il expire à la fin de la session de navigation.
          </li>
        </ul>
        <p>
          Aucun cookie tiers, cookie de tracking, cookie publicitaire ou cookie de mesure d&apos;audience
          externe (type Google Analytics) n&apos;est déposé sur votre terminal. La mesure d&apos;audience
          est réalisée exclusivement via le mécanisme de heartbeat interne décrit à l&apos;article 4.2, sans
          dépôt de cookie.
        </p>
      </section>

      {/* ===== 13. RÉCLAMATION CNIL ===== */}
      <section>
        <h2 className="text-2xl font-semibold">13. Droit d&apos;introduire une réclamation auprès de la CNIL</h2>
        <p>
          Conformément à l&apos;article 77 du RGPD, si vous estimez que le traitement de vos données personnelles
          constitue une violation du RGPD ou de la loi Informatique et Libertés, vous disposez du droit
          d&apos;introduire une réclamation auprès de l&apos;autorité de contrôle compétente, la Commission
          Nationale de l&apos;Informatique et des Libertés (CNIL) :
        </p>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <p><strong>CNIL</strong></p>
          <p>3 Place de Fontenoy — TSA 80715</p>
          <p>75334 PARIS CEDEX 07</p>
          <p>Téléphone : 01 53 73 22 22</p>
          <p>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline text-primary">www.cnil.fr</a></p>
        </div>
        <p className="mt-2">
          Cette réclamation peut être introduite sans préjudice de tout autre recours administratif ou
          juridictionnel.
        </p>
      </section>

      {/* ===== 14. MODIFICATIONS ===== */}
      <section>
        <h2 className="text-2xl font-semibold">14. Mise à jour de la Politique de confidentialité</h2>
        <p>
          La présente Politique de confidentialité est susceptible d&apos;être modifiée pour tenir compte des
          évolutions légales, réglementaires, techniques ou fonctionnelles de la Plateforme. En cas de
          modification substantielle, les Utilisateurs seront informés par email au moins 15 jours avant
          l&apos;entrée en vigueur des modifications, et invités à prendre connaissance de la nouvelle version.
        </p>
        <p>
          La date de dernière mise à jour est indiquée en tête de ce document. Nous vous invitons à consulter
          régulièrement cette page.
        </p>
      </section>
    </main>
  );
}
