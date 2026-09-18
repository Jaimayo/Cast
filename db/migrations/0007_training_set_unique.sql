DELETE FROM "training_set_assets" AS dup
USING "training_set_assets" AS keep
WHERE dup."character_pack_id" = keep."character_pack_id"
  AND dup."media_asset_id" = keep."media_asset_id"
  AND dup."id" > keep."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "training_set_assets_pack_media_idx" ON "training_set_assets" USING btree ("character_pack_id","media_asset_id");
