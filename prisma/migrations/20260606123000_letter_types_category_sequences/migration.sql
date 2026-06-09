-- Add hierarchical letter master data without removing existing categories or letters.
ALTER TABLE "letter_categories"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE TABLE IF NOT EXISTS "letter_types" (
  "id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "type_name" VARCHAR(180) NOT NULL,
  "type_code" VARCHAR(30) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "letter_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "letter_types_category_id_type_code_key"
  ON "letter_types"("category_id", "type_code");

CREATE INDEX IF NOT EXISTS "letter_types_category_id_is_active_idx"
  ON "letter_types"("category_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'letter_types_category_id_fkey'
      AND table_name = 'letter_types'
  ) THEN
    ALTER TABLE "letter_types"
      ADD CONSTRAINT "letter_types_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "letter_categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "letters"
  ADD COLUMN IF NOT EXISTS "generated_letter_number" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "letter_type_id" UUID,
  ADD COLUMN IF NOT EXISTS "sequence_number" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "letters_generated_letter_number_key"
  ON "letters"("generated_letter_number");

CREATE INDEX IF NOT EXISTS "letters_letter_type_id_status_idx"
  ON "letters"("letter_type_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'letters_letter_type_id_fkey'
      AND table_name = 'letters'
  ) THEN
    ALTER TABLE "letters"
      ADD CONSTRAINT "letters_letter_type_id_fkey"
      FOREIGN KEY ("letter_type_id") REFERENCES "letter_types"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
