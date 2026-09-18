CREATE TYPE "public"."user_role" AS ENUM('consumer', 'admin');
--> statement-breakpoint
CREATE TYPE "public"."pack_origin" AS ENUM('generate_then_lock', 'library_train');
--> statement-breakpoint
CREATE TYPE "public"."pack_status" AS ENUM('draft', 'locked', 'training', 'ready', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."job_kind" AS ENUM('generate_still', 'train_pack', 'generate_starter');
--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'canceled');
--> statement-breakpoint
CREATE TYPE "public"."provider_name" AS ENUM('venice', 'runpod', 'sister');
--> statement-breakpoint
CREATE TYPE "public"."training_asset_kind" AS ENUM('face_ref', 'body_ref', 'still', 'starter_face', 'starter_body');
--> statement-breakpoint
CREATE TYPE "public"."training_asset_source" AS ENUM('in_app_still', 'generate_starter');
--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('still', 'pack_ref', 'starter');
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'consumer' NOT NULL,
	"age_attested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"redeemed_by_user_id" uuid,
	"redeemed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invite_codes_code_idx" ON "invite_codes" USING btree ("code");
--> statement-breakpoint
CREATE TABLE "character_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"origin" "pack_origin" DEFAULT 'generate_then_lock' NOT NULL,
	"status" "pack_status" DEFAULT 'draft' NOT NULL,
	"fictional_attestation" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp with time zone,
	"trained_at" timestamp with time zone,
	"provider_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text DEFAULT 'image/webp' NOT NULL,
	"byte_size" integer,
	"generation_job_id" uuid,
	"character_pack_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_set_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_pack_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"kind" "training_asset_kind" NOT NULL,
	"source" "training_asset_source" NOT NULL,
	"starter_preset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_pack_id" uuid NOT NULL,
	"pose_chip_id" text NOT NULL,
	"outfit_chip_id" text NOT NULL,
	"scene_chip_id" text NOT NULL,
	"lighting_chip_id" text NOT NULL,
	"body_chip_id" text,
	"compiled_prompt_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"provider" "provider_name" NOT NULL,
	"character_pack_id" uuid,
	"recipe_id" uuid,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_asset_key" text,
	"error_code" text,
	"provider_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_redeemed_by_user_id_users_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_packs" ADD CONSTRAINT "character_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_character_pack_id_character_packs_id_fk" FOREIGN KEY ("character_pack_id") REFERENCES "public"."character_packs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_set_assets" ADD CONSTRAINT "training_set_assets_character_pack_id_character_packs_id_fk" FOREIGN KEY ("character_pack_id") REFERENCES "public"."character_packs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_set_assets" ADD CONSTRAINT "training_set_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_set_assets" ADD CONSTRAINT "training_set_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_character_pack_id_character_packs_id_fk" FOREIGN KEY ("character_pack_id") REFERENCES "public"."character_packs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_character_pack_id_character_packs_id_fk" FOREIGN KEY ("character_pack_id") REFERENCES "public"."character_packs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;
