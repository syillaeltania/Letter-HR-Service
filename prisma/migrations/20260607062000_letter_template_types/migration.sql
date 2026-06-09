ALTER TABLE "letter_templates"
  ADD COLUMN IF NOT EXISTS "letter_type_id" UUID;

CREATE INDEX IF NOT EXISTS "letter_templates_letter_type_id_status_idx"
  ON "letter_templates"("letter_type_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'letter_templates_letter_type_id_fkey'
      AND table_name = 'letter_templates'
  ) THEN
    ALTER TABLE "letter_templates"
      ADD CONSTRAINT "letter_templates_letter_type_id_fkey"
      FOREIGN KEY ("letter_type_id") REFERENCES "letter_types"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
