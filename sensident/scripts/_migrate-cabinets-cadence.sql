-- Sensident — Migration cabinets : ajout colonne newsletter_cadence
--
-- 2026-07-07 (Tartrinator) : suite demande praticien.
--
-- Stocke la cadence d'envoi souhaitee par le cabinet :
--   {
--     frequency: 'weekly' | 'biweekly' | 'monthly' | null,
--     sendDay:   0..6 (0=dimanche) | 1..7 (1=lundi) selon locale,
--     sendHour:  0..23 (heure locale du praticien)
--   }
--
-- Utilise par :
--   /dashboard/account (UI preference)
--   composer send-step (boutons "prochaine occurrence")
--   cron d'envoi (defaut si pas de scheduledAt explicite)
--
-- Valeur par defaut : NULL (= pas configure = comportement actuel inchangé).

ALTER TABLE cabinets
  ADD COLUMN IF NOT EXISTS newsletter_cadence JSONB;

-- Commentaire de doc
COMMENT ON COLUMN cabinets.newsletter_cadence IS
  'Cadence envoi newsletter: { frequency, sendDay, sendHour }. NULL = pas configuré.';
