ALTER TABLE "character_packs" ADD COLUMN "adapter_id" text;
--> statement-breakpoint
ALTER TABLE "character_packs" ADD COLUMN "adapter_status" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "character_packs" ADD COLUMN "adapter_source" text;
--> statement-breakpoint
UPDATE "character_packs"
SET
  "adapter_id" = COALESCE("adapter_id", "provider_job_id"),
  "adapter_status" = 'ready',
  "adapter_source" = CASE
    WHEN ("adapter_meta" ->> 'stub') = 'true' THEN 'stub'
    WHEN ("adapter_meta" ->> 'adapterSource') IN ('stub', 'live') THEN "adapter_meta" ->> 'adapterSource'
    ELSE 'live'
  END
WHERE "adapter_storage_key" IS NOT NULL AND btrim("adapter_storage_key") <> '';
