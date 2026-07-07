-- Sensident — Migration SQLite (dev local uniquement)
-- Ajout colonne newsletter_cadence sur cabinets.
ALTER TABLE cabinets ADD COLUMN newsletter_cadence TEXT;
