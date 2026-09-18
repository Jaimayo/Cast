ALTER TABLE "character_packs" ADD COLUMN "adapter_storage_key" text;
--> statement-breakpoint
ALTER TABLE "character_packs" ADD COLUMN "adapter_mime_type" text;
--> statement-breakpoint
ALTER TABLE "character_packs" ADD COLUMN "adapter_meta" jsonb;
