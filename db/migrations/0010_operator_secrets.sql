CREATE TABLE "operator_secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"ciphertext" text,
	"iv" text,
	"auth_tag" text,
	"key_last4" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operator_secrets" ADD CONSTRAINT "operator_secrets_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
