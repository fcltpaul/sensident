-- Ajout colonne newsletter_branding (P2)
ALTER TABLE cabinets ADD COLUMN newsletter_branding jsonb DEFAULT '{"showLogo":false}'::jsonb NOT NULL;
