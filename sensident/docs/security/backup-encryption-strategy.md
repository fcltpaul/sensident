# Stratégie de backup chiffré & PRA — Sensident

> **Date** : 9 juin 2026.
> **Statut** : Draft, à valider avec hébergeur HDS retenu (Scaleway / OVHcloud / Outscale / Clever Cloud).
> **Owner** : Paul Foucault (DPO interne) + hébergeur HDS (co-responsable infra).
> **Conformité** : HDS (ANS), RGPD art. 32 (sécurité du traitement), recommandations ANSSI.

---

## 1. Objectifs

| Métrique | Cible | Justification |
|---|---|---|
| **RPO** (Recovery Point Objective) | **≤ 1 heure** | Données patient (consentements, lectures, désabonnements) doivent être restaurables à l'heure près en cas d'incident. |
| **RTO** (Recovery Time Objective) | **≤ 4 heures** | Temps max d'indisponibilité toléré pour le service patient + praticien. |
| **Rétention des backups** | **30 jours** (quotidiens) + **1 an** (mensuels chiffrés) | Conformité HDS + capacité de reconstitution post-incident long (ransomware). |
| **Localisation** | **France / UE uniquement** | RGPD + HDS. Pas de transfert hors UE. |
| **Chiffrement at-rest** | **AES-256-GCM** minimum | Standard ANSSI. |
| **Chiffrement in-transit** | **TLS 1.3** | Standard ANSSI. |
| **Test de restauration** | **1x/trimestre** | Preuve d'efficacité, obligation HDS. |

---

## 2. Typologie des sauvegardes

### 2.1 Snapshot PostgreSQL quotidien (incrémental)

- **Outil** : `pg_basebackup` (PITR) ou snapshot L0+L1 du volume ZFS/Storage de l'hébergeur.
- **Fréquence** : quotidien à 02h00 (Europe/Paris), fenêtre de maintenance 02h00-04h00.
- **Rétention** : 30 jours en local (stockage hébergeur), puis archivage chiffré 1 an (cf. §2.3).
- **Chiffrement** : natif stockage HDS (LUKS/TDE selon hébergeur) + couche applicative optionnelle (cf. §4).
- **Vérification** : checksum SHA-256 calculé immédiatement après snapshot, loggé en métrique.

### 2.2 Dump logique quotidien (PITR-friendly)

- **Outil** : `pg_dump --format=custom --compress=9` de la base principale.
- **Fréquence** : quotidien à 03h00, après le snapshot.
- **Destination primaire** : bucket S3-compatible chiffré de l'hébergeur HDS (ex. Scaleway Object Storage SSE-C).
- **Destination secondaire** : bucket S3-compatible hors hébergeur principal (ex. OVHcloud Object Storage, ou Backblaze B2 région EU).
- **Rétention** : 30 jours primary + 30 jours secondary.
- **Chiffrement** : SSE-C (clé client) ou SSE-KMS (clé gérée hébergeur) — voir §4 pour la décision.

### 2.3 Archive mensuelle chiffrée (cold storage)

- **Fréquence** : 1er de chaque mois à 04h00.
- **Composition** : agrégat du dump quotidien du 1er + tous les logs d'audit du mois précédent (export `pg_dump` table `audit_logs`).
- **Destination** : cold storage (S3 Glacier / Glacier Deep Archive / OVHcloud Cold Archive).
- **Rétention** : 1 an minimum, puis effacement définitif automatique (lifecycle policy).
- **Chiffrement** : clé dédiée stockée dans un KMS HDS, rotation annuelle.

### 2.4 Backup des secrets

- **Contenu** : `.env.production` complet, clés API, certificats SSL/TLS, secrets Stripe/Brevo.
- **Stockage** : **Vault HDS** (HashiCorp Vault managé par hébergeur HDS, ou Vault auto-hébergé sur infra HDS).
- **Accès** : 2 personnes minimum (Paul + Dr Thibault) + 1 personne hébergeur habilitée.
- **Rétention** : 3 versions historiques (avant chaque rotation).

### 2.5 Backup du code source

- **Source de vérité** : GitHub `fcltpaul/sensident-web` (privé) — pas un backup, c'est la source.
- **Backup** : miroir Git auto-pushé vers GitLab self-hosted HDS (1x/jour) ou réplication du repo via `git bundle` quotidien.
- **Tags** : chaque release MVP taguée `v0.x.y`, conservée ad vitam.
- **Clé SSH de déploiement** : stockée dans Vault HDS (§2.4), rotation annuelle.

---

## 3. Architecture cible

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Production HDS (ex. Scaleway HDS)                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │ App Next.js  │───▶│ PostgreSQL 16│───▶│ Réplication  │         │
│  │ (multi-AZ)   │    │ (RLS + TDE)  │    │ standby (RO) │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                              │                                       │
│                              │ pg_dump quotidien (03h00)            │
│                              ▼                                       │
│                   ┌──────────────────────┐                          │
│                   │ Bucket S3 chiffré    │ (Scaleway Object)        │
│                   │ SSE-C, 30j rétention │                          │
│                   └──────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Réplication cross-provider
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Backup secondaire (OVHcloud HDS, EU)                  │
│  ┌──────────────────────┐    ┌──────────────────────┐              │
│  │ Bucket S3 chiffré    │    │ Vault secrets        │              │
│  │ miroir, 30j          │    │ backup Vault prod    │              │
│  └──────────────────────┘    └──────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Archive mensuelle
                              ▼
                   ┌──────────────────────┐
                   │ Cold storage         │
                   │ chiffré 1 an         │
                   │ (Glacier / OVH Cold) │
                   └──────────────────────┘
```

---

## 4. Choix du chiffrement

### 4.1 Options évaluées

| Option | Description | Avantages | Inconvénients | Verdict |
|---|---|---|---|---|
| **SSE-S3 (S3-managed keys)** | Clés gérées par le provider S3 | Simple, pas de gestion locale | Provider = root of trust, pas de contrôle hébergeur HDS seulement | ❌ Non retenu (pas d'alignement HDS) |
| **SSE-KMS (Key Management Service)** | Clés dans un KMS managé | Rotation centralisée, audit CloudTrail | Dépendance forte au KMS provider | ⚠️ Acceptable si KMS HDS |
| **SSE-C (Server-Side Encryption with Customer Keys)** | Clé client fournie à chaque PUT/GET | Contrôle total de la clé | Gestion locale de la clé (Vault) | ✅ **Recommandé** |
| **Chiffrement client-side (rclone/crypt)** | Chiffrement local avant upload | Defense in depth (2 couches) | Complexité opérationnelle, perf | ✅ Recommandé **en plus** de SSE-C |

### 4.2 Décision Sensident

**Chiffrement à 2 couches** (defense in depth) :

1. **Couche 1 — SSE-C** : tous les dumps PostgreSQL uploadés dans S3 avec une clé AES-256 fournie par Vault HDS. La clé est wrappée (envelope encryption) : KMS HDS fournit la KEK (Key Encryption Key), Vault stocke la DEK (Data Encryption Key).
2. **Couche 2 — Client-side** : pour les archives mensuelles, un second chiffrement `age` (chiffrement moderne simple) avec une clé hors-ligne stockée dans un coffre-fort physique (banque). Cela protège contre un compromis total du cloud (admin provider compromis).

**Rotation des clés** :
- DEK : rotation mensuelle (alignée sur archive mensuelle)
- KEK : rotation annuelle
- Clé offline (`age`) : rotation tous les 2 ans, double contrôle (Paul + Dr Thibault)

---

## 5. Procédure de restauration

### 5.1 Restauration standard (incident < 24h)

1. **Déclenchement** : alerte monitoring (perte réplication, erreur Postgres, etc.) → on-call alerté
2. **Évaluation** : RPO à respecter ? Si on est dans la fenêtre PITR (≤ 1h), PITR via WAL archiving
3. **Action** :
   - Si primaire corrompu : promotion du standby
   - Si données corrompues : PITR vers le dernier point connu
4. **Validation** : tests automatisés E2E (smoke + auth flow)
5. **Communication** : status page + email praticiens (si > 1h d'indispo)
6. **RTO cible** : 30 min si juste promotion standby, 2h si PITR

### 5.2 Restauration depuis backup froid (incident majeur / ransomware)

1. **Déclenchement** : compromission totale infra ou perte de plusieurs jours de données
2. **Sélection du backup** : on remonte au dump le plus récent acceptable (typiquement J-1)
3. **Vérification préalable** : tester le dump dans une sandbox isolée (infra de staging), checksum OK
4. **Restauration** : `pg_restore` sur cluster vierge HDS
5. **Rejeu des WAL** : si PITR souhaité, rejouer les WAL jusqu'à T0
6. **Validation** : tests E2E + audit logs reconstruits
7. **Communication** : status page, email praticiens, **notification CNIL si données patient compromises (art. 33 RGPD, 72h)**
8. **RTO cible** : 4h

### 5.3 Tests de restauration

- **Fréquence** : trimestrielle (1er trimestre, 2e trimestre, etc.)
- **Périmètre du test** : restauration complète depuis dump quotidien + replay PITR 1h
- **Métriques mesurées** : RTO réel, RPO réel, taux d'erreur de restauration
- **Documentation** : PV signé Paul + hébergeur, conservé 5 ans
- **Échec du test** : déclencher post-mortem + plan d'action correctif

---

## 6. Plan de Reprise d'Activite (PRA)

### 6.1 Scénarios identifiés

| Scénario | Probabilité | Impact | RTO visé | RPO visé |
|---|---|---|---|---|
| Crash app (1 instance) | Élevée | Faible | 5 min (auto-scaling) | 0 |
| Crash DB primaire (failover standby) | Moyenne | Élevé | 30 min | 0-5 min (sync replication) |
| Corruption données (PITR) | Faible | Élevé | 2h | 1h |
| Perte datacenter (DR) | Très faible | Critique | 4h | 1h (réplication async cross-region) |
| Ransomware / compromission totale | Très faible | Critique | 4h | 24h (J-1) |
| Perte provider HDS (faillite) | Très faible | Critique | 7 jours (migration nouveau provider) | 1h |

### 6.2 Cellule de crise

- **Acteur principal** : Paul (décisionnaire)
- **Acteur technique** : hébergeur HDS (astreinte 24/7)
- **Acteur métier** : Dr Thibault (validation décisions patient)
- **Délai de mobilisation** : 1h (heures ouvrées) / 4h (nuit/WE)

### 6.3 Communication de crise

- **Status page publique** : `status.sensident.fr` (hébergé hors HDS, DNS externe)
- **Email praticiens** : transactionnel Brevo (canal secondaire)
- **Patients** : uniquement si impact sur leurs données
- **CNIL** : notification sous 72h si violation de données personnelles
- **ANS** : notification si incident HDS impactant la disponibilité ou intégrité

---

## 7. Métriques & monitoring

### 7.1 Métriques automatisées

- `backup.last_success_ts` (Prometheus) — alerte si > 26h
- `backup.last_size_bytes` — alerte si variation > 50% vs J-7
- `backup.last_checksum` — vérification intégrité
- `backup.restore_test.last_success_ts` — alerte si > 100 jours
- `vault.last_rotation_ts` — alerte si > 365 jours

### 7.2 Logs d'audit

Tous les événements backup/restore sont loggés dans `audit_logs` (table PG) avec :
- `action`: `backup_created`, `backup_restored`, `key_rotated`, `restore_test_run`
- `actor_type`: `system` ou `practitioner` (Paul)
- `metadata`: checksum, taille, durée, emplacement

---

## 8. Conformité HDS — points de contrôle

L'hébergeur HDS doit fournir (extrait de la doctrine ANS) :

- [ ] Certification HDS en cours de validité
- [ ] Chiffrement at-rest activé sur tous les volumes de stockage
- [ ] Chiffrement in-transit (TLS 1.3) pour toutes les interfaces
- [ ] Logs d'accès immuables conservés 1 an
- [ ] Astreinte 24/7 avec engagement de réponse < 1h
- [ ] Capacité de restauration documentée et testée
- [ ] Isolation réseau (VPC dédié, pas d'Internet direct)
- [ ] Audit ANSSI/ANS dans les 12 derniers mois

**Vérification à faire lors de la signature du contrat hébergeur.**

---

## 9. Runbook opérationnel

### 9.1 Créer un backup manuel d'urgence

```bash
# Sur l'instance HDS (ou via bastion)
PGPASSWORD=$DB_PASSWORD pg_dump \
  --host=$DB_HOST \
  --port=5432 \
  --username=sensident_app \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  sensident_prod > /tmp/emergency-$(date +%Y%m%d-%H%M).dump

# Chiffrement local (couche 2)
age -e -r age1... < /tmp/emergency-*.dump > /tmp/emergency-*.dump.age
shred -u /tmp/emergency-*.dump  # Effacement sécurisé

# Upload vers backup secondaire
aws s3 cp /tmp/emergency-*.dump.age s3://sensident-backup-emergency/ \
  --endpoint-url=$S3_ENDPOINT \
  --sse-c AES256 \
  --sse-c-key $DEK_BASE64
```

### 9.2 Restaurer un backup d'urgence

```bash
# Récupération du backup
aws s3 cp s3://sensident-backup-emergency/emergency-20260609.dump.age . \
  --endpoint-url=$S3_ENDPOINT

# Déchiffrement (couche 2)
age -d -i ~/.age/key.txt < emergency-*.dump.age > emergency.dump

# Restauration sur cluster vierge
pg_restore --host=$NEW_DB_HOST --username=sensident_app \
  --dbname=sensident_recovery --no-owner --no-privileges \
  --jobs=4 emergency.dump

# Vérification
psql --host=$NEW_DB_HOST --username=sensident_app \
  --dbname=sensident_recovery \
  --command="SELECT COUNT(*) FROM patient_consents;"
```

---

## 10. Roadmap

| Étape | Délai | Owner |
|---|---|---|
| Valider cette doc avec hébergeur HDS retenu | T-30j go-live | Paul + hébergeur |
| Provisionner Vault HDS (secrets + clés) | T-30j go-live | hébergeur |
| Configurer snapshots auto (pg_basebackup ou L0+ZFS) | T-21j go-live | hébergeur |
| Configurer pg_dump quotidien + upload S3 SSE-C | T-21j go-live | hébergeur |
| Implémenter monitoring (Prometheus) | T-14j go-live | Tartrinator (sous-agent technique) |
| 1er test de restauration | T-7j go-live | Paul + hébergeur |
| Réplication cross-provider | T-7j go-live | hébergeur |
| Procédure ransomware (documentation air-gap) | T-7j go-live | Paul + Dr Thibault |

---

## 11. Annexes

### A. Variables d'environnement liées

```bash
# Database
DB_HOST=...
DB_PORT=5432
DB_NAME=sensident_prod
DB_USER=sensident_app
DB_PASSWORD=...            # Vault-managed

# Backup
S3_ENDPOINT=https://s3.fr-par.scw.cloud
S3_BUCKET=sensident-backup-prod
S3_ACCESS_KEY=...          # Vault-managed
S3_SECRET_KEY=...          # Vault-managed
DEK_BASE64=...             # Vault-managed, rotation mensuelle
KEK_ID=...                 # KMS HDS, rotation annuelle

# Vault
VAULT_ADDR=https://vault.sensident.fr
VAULT_TOKEN=...            # OIDC, jamais statique

# Monitoring
PROMETHEUS_PUSHGATEWAY=...
ALERT_WEBHOOK=https://alerts.sensident.fr/webhook/backup
```

### B. Schéma de la DEK

```json
{
  "version": 1,
  "kek_id": "kms-hds-2026-q2",
  "dek_id": "dek-2026-06",
  "algorithm": "AES-256-GCM",
  "created_at": "2026-06-01T00:00:00Z",
  "expires_at": "2026-07-01T00:00:00Z",
  "wrapping": {
    "kek_provider": "scaleway-kms-hds",
    "wrapped_dek": "base64..."
  }
}
```

### C. Références

- Doctrine HDS ANS : https://esante.gouv.fr/produits-services/hds
- ANSSI — Recommandations sauvegarde : https://www.ssi.gouv.fr/administration/precautions-elementaires/bonnes-pratiques-de-sauvegarde/
- RGPD art. 32 : https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre-iv-section-1
- Scaleway HDS : https://www.scaleway.com/en/hebergement-de-donnees-de-sante/
- OVHcloud HDS : https://www.ovhcloud.com/fr/hosted-private-cloud/hds/
