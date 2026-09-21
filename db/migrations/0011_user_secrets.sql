CREATE TABLE "user_secrets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"ciphertext" text,
	"iv" text,
	"auth_tag" text,
	"key_last4" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_secrets" ADD CONSTRAINT "user_secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
