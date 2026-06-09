ALTER TABLE "letters"
ADD COLUMN "letter_date" TIMESTAMP(3),
ADD COLUMN "letter_month" INTEGER,
ADD COLUMN "letter_year" INTEGER,
ADD COLUMN "letter_month_roman" VARCHAR(8);

UPDATE "letters"
SET
  "letter_date" = CASE
    WHEN "content"->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN ("content"->>'letter_date')::date
    ELSE NULL
  END,
  "letter_month" = CASE
    WHEN "content"->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN EXTRACT(MONTH FROM ("content"->>'letter_date')::date)::integer
    ELSE NULL
  END,
  "letter_year" = CASE
    WHEN "content"->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN EXTRACT(YEAR FROM ("content"->>'letter_date')::date)::integer
    ELSE NULL
  END,
  "letter_month_roman" = CASE EXTRACT(MONTH FROM ("content"->>'letter_date')::date)::integer
    WHEN 1 THEN 'I'
    WHEN 2 THEN 'II'
    WHEN 3 THEN 'III'
    WHEN 4 THEN 'IV'
    WHEN 5 THEN 'V'
    WHEN 6 THEN 'VI'
    WHEN 7 THEN 'VII'
    WHEN 8 THEN 'VIII'
    WHEN 9 THEN 'IX'
    WHEN 10 THEN 'X'
    WHEN 11 THEN 'XI'
    WHEN 12 THEN 'XII'
    ELSE NULL
  END
WHERE "content"->>'letter_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

CREATE INDEX "letters_category_id_letter_month_letter_year_idx"
ON "letters"("category_id", "letter_month", "letter_year");
