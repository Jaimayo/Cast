ALTER TABLE "training_set_assets" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "training_set_assets" AS t
SET "sort_order" = sub.n - 1
FROM (
  SELECT id, row_number() OVER (PARTITION BY character_pack_id ORDER BY created_at, id) AS n
  FROM "training_set_assets"
) AS sub
WHERE t.id = sub.id;
