import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["consumer", "admin"]);
export const packOriginEnum = pgEnum("pack_origin", ["generate_then_lock", "library_train"]);
export const packStatusEnum = pgEnum("pack_status", [
  "draft",
  "locked",
  "training",
  "ready",
  "failed",
]);
export const jobKindEnum = pgEnum("job_kind", ["generate_still", "train_pack", "generate_starter"]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export const providerEnum = pgEnum("provider_name", ["venice", "runpod", "sister"]);
export const trainingAssetKindEnum = pgEnum("training_asset_kind", [
  "face_ref",
  "body_ref",
  "still",
  "starter_face",
  "starter_body",
]);
export const trainingAssetSourceEnum = pgEnum("training_asset_source", [
  "in_app_still",
  "generate_starter",
]);
export const mediaKindEnum = pgEnum("media_kind", ["still", "pack_ref", "starter"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("consumer"),
    /** Self-attest timestamp. Studio is blocked until this is set. */
    ageAttestedAt: timestamp("age_attested_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    note: text("note"),
    maxUses: integer("max_uses").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    redeemedByUserId: uuid("redeemed_by_user_id").references(() => users.id),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("invite_codes_code_idx").on(table.code)],
);

export const characterPacks = pgTable("character_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  origin: packOriginEnum("origin").notNull().default("generate_then_lock"),
  status: packStatusEnum("status").notNull().default("draft"),
  fictionalAttestation: boolean("fictional_attestation").notNull().default(true),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  trainedAt: timestamp("trained_at", { withTimezone: true }),
  providerJobId: text("provider_job_id"),
  /**
   * Locked Soul ID adapter identity. Generate reads these — not adapter_meta.
   * adapter_id = persisted train job id; adapter_storage_key = object path;
   * adapter_status = none | pending | ready | failed;
   * adapter_source = stub | live.
   */
  adapterId: text("adapter_id"),
  /** Object-storage key for the trained LoRA / IP-Adapter when RunPod finishes. */
  adapterStorageKey: text("adapter_storage_key"),
  adapterMimeType: text("adapter_mime_type"),
  adapterStatus: text("adapter_status").notNull().default("none"),
  adapterSource: text("adapter_source"),
  adapterMeta: jsonb("adapter_meta").$type<Record<string, unknown>>(),
  ...timestamps,
});

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull().default("image/webp"),
    byteSize: integer("byte_size"),
    generationJobId: uuid("generation_job_id"),
    characterPackId: uuid("character_pack_id").references(() => characterPacks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("media_assets_generation_job_id_idx").on(table.generationJobId)],
);

export const trainingSetAssets = pgTable(
  "training_set_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterPackId: uuid("character_pack_id")
      .notNull()
      .references(() => characterPacks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    kind: trainingAssetKindEnum("kind").notNull(),
    source: trainingAssetSourceEnum("source").notNull(),
    starterPresetId: text("starter_preset_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("training_set_assets_pack_media_idx").on(table.characterPackId, table.mediaAssetId),
  ],
);

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  characterPackId: uuid("character_pack_id")
    .notNull()
    .references(() => characterPacks.id, { onDelete: "restrict" }),
  poseChipId: text("pose_chip_id").notNull(),
  outfitChipId: text("outfit_chip_id"),
  sceneChipId: text("scene_chip_id"),
  lightingChipId: text("lighting_chip_id"),
  bodyChipId: text("body_chip_id"),
  /** SHA-256 of the compiled prompt. The prompt string itself is not stored. */
  compiledPromptHash: text("compiled_prompt_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: jobKindEnum("kind").notNull(),
  status: jobStatusEnum("status").notNull().default("queued"),
  provider: providerEnum("provider").notNull(),
  characterPackId: uuid("character_pack_id").references(() => characterPacks.id, {
    onDelete: "set null",
  }),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  /**
   * Structured chip/preset ids only — never the compiled prompt.
   * Workers re-compile in memory at run time.
   */
  inputJson: jsonb("input_json").$type<Record<string, unknown>>().notNull().default({}),
  resultAssetKey: text("result_asset_key"),
  errorCode: text("error_code"),
  /** User-safe failure copy for Jobs UI. Never a compiled prompt or provider payload. */
  errorMessage: text("error_message"),
  /** 1-based BullMQ worker try. 0 = queued and not yet started. */
  attemptsMade: integer("attempts_made").notNull().default(0),
  providerJobId: text("provider_job_id"),
  ...timestamps,
});

export const usersRelations = relations(users, ({ many }) => ({
  packs: many(characterPacks),
  jobs: many(generationJobs),
}));

export const characterPacksRelations = relations(characterPacks, ({ one, many }) => ({
  user: one(users, { fields: [characterPacks.userId], references: [users.id] }),
  trainingAssets: many(trainingSetAssets),
  jobs: many(generationJobs),
}));

export const trainingSetAssetsRelations = relations(trainingSetAssets, ({ one }) => ({
  pack: one(characterPacks, {
    fields: [trainingSetAssets.characterPackId],
    references: [characterPacks.id],
  }),
  media: one(mediaAssets, {
    fields: [trainingSetAssets.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const generationJobsRelations = relations(generationJobs, ({ one }) => ({
  user: one(users, { fields: [generationJobs.userId], references: [users.id] }),
  pack: one(characterPacks, {
    fields: [generationJobs.characterPackId],
    references: [characterPacks.id],
  }),
  recipe: one(recipes, { fields: [generationJobs.recipeId], references: [recipes.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type CharacterPack = typeof characterPacks.$inferSelect;
export type TrainingSetAsset = typeof trainingSetAssets.$inferSelect;
export type GenerationJob = typeof generationJobs.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
