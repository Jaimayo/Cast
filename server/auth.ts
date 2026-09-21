import "server-only";

import { cookies } from "next/headers";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { inviteCodes, users, type InviteCode, type User } from "@/db/schema";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { AuthError } from "@/lib/auth-error";
import { assertAdmin, assertAttested, assertSignedIn, sessionAgeFlag } from "@/lib/auth-guards";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/constants";
import { isUniqueViolation } from "@/lib/db-errors";
import { newInviteCode } from "@/lib/invite-code";
import { classifyInvite, normalizeInviteCode, throwIfInviteUnusable } from "@/lib/invite-status";
import { stubReviewInviteCode, roleForReviewUser } from "@/lib/review-preview";
import { decodeSession, encodeSession, sessionCookieAttrs, sessionNeedsRefresh } from "@/lib/session-cookie";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { stubPreviewUserId } from "@/lib/stub-user-id";
import { isMemoryPreview, previewUserFromSession } from "@/server/memory-preview";

export { AuthError } from "@/lib/auth-error";

const MAX_INVITE_USES = 50;

function cookieBase() {
  return sessionCookieAttrs({
    production: getEnv().nodeEnv === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

async function setSessionCookie(
  userId: string,
  ageAttested: boolean,
  extras?: { email?: string; role?: "admin" | "consumer" },
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await encodeSession(
    { sub: userId, exp, age: ageAttested, email: extras?.email, role: extras?.role },
    getEnv().sessionSecret,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieBase());
}

function sessionExtras(user: Pick<User, "email" | "role">) {
  return { email: user.email, role: user.role };
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    "",
    sessionCookieAttrs({
      production: getEnv().nodeEnv === "production",
      maxAge: 0,
    }),
  );
}

/** Revoke the session cookie when one is present. Always expires the cookie so leftovers cannot linger. */
export async function revokeSessionCookie(): Promise<{ revoked: boolean }> {
  const jar = await cookies();
  const revoked = Boolean(jar.get(SESSION_COOKIE)?.value);
  await clearSessionCookie();
  return { revoked };
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const payload = await decodeSession(token, getEnv().sessionSecret);
  return payload?.sub ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const payload = await decodeSession(token, getEnv().sessionSecret);
  if (!payload) {
    return null;
  }
  if (isMemoryPreview()) {
    return previewUserFromSession(payload);
  }
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  return rows[0] ?? null;
}

/** Remint the signed cookie when the age flag drifted or remaining TTL is below half. */
export async function ensureSessionMatchesUser(user: User): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = token ? await decodeSession(token, getEnv().sessionSecret) : null;
  const age = sessionAgeFlag(user.ageAttestedAt);
  if (!sessionNeedsRefresh(payload, { sub: user.id, age })) {
    return;
  }
  await setSessionCookie(user.id, age, sessionExtras(user));
}

export async function requireUser(): Promise<User> {
  return assertSignedIn(await getCurrentUser());
}

export async function requireAttestedUser(): Promise<User> {
  return assertAttested(await getCurrentUser());
}

export async function requireAdmin(): Promise<User> {
  return assertAdmin(await getCurrentUser());
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function inviteRedeemable(id: string, now: Date) {
  return and(
    eq(inviteCodes.id, id),
    isNull(inviteCodes.revokedAt),
    sql`${inviteCodes.useCount} < ${inviteCodes.maxUses}`,
    or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
  );
}

async function resumeCurrentSession(): Promise<User | null> {
  const current = await getCurrentUser();
  if (!current) {
    return null;
  }
  await ensureSessionMatchesUser(current);
  return current;
}

export async function redeemInvite(input: {
  email: string;
  password: string;
  inviteCode: string;
}): Promise<User> {
  const resumed = await resumeCurrentSession();
  if (resumed) {
    return resumed;
  }

  const email = input.email.trim().toLowerCase();
  const code = normalizeInviteCode(input.inviteCode);
  if (!email || !input.password || !code) {
    throw new AuthError("Email, password, and invite code are required", 400);
  }
  if (input.password.length < 10) {
    throw new AuthError("Password must be at least 10 characters", 400);
  }

  const passwordHash = await hashPassword(input.password);
  const env = getEnv();
  const role = roleForReviewUser(email, {
    adminEmails: env.adminEmails,
    stubReviewGrantsAdmin: env.stubReviewGrantsAdmin,
  });

  if (isMemoryPreview()) {
    const expected = stubReviewInviteCode(getEnv().providerMode, process.env.REVIEW_INVITE_CODE);
    throwIfInviteUnusable(expected && code === expected ? "ok" : "invalid");
    const now = new Date();
    // Cookie-only stub: same email always gets the same user id so Venice settings survive re-login.
    const created: User = {
      id: stubPreviewUserId(email),
      email,
      passwordHash,
      role,
      ageAttestedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await setSessionCookie(created.id, false, sessionExtras(created));
    return created;
  }

  const db = getDb();

  try {
    const created = await db.transaction(async (tx) => {
      const existing = await tx.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing[0]) {
        throw new AuthError("An account already exists for this email. Sign in instead.", 409);
      }

      const invites = await tx
        .select()
        .from(inviteCodes)
        .where(eq(inviteCodes.code, code))
        .limit(1)
        .for("update");
      const invite = invites[0];
      throwIfInviteUnusable(classifyInvite(invite));
      if (!invite) {
        throw new AuthError("This invite code is invalid.", 400);
      }

      const inserted = await tx
        .insert(users)
        .values({ email, passwordHash, role })
        .returning();
      const user = inserted[0];
      if (!user) {
        throw new AuthError("Could not create user", 500);
      }

      const now = new Date();
      const bumped = await tx
        .update(inviteCodes)
        .set({
          useCount: sql`${inviteCodes.useCount} + 1`,
          redeemedByUserId: user.id,
          redeemedAt: now,
        })
        .where(inviteRedeemable(invite.id, now))
        .returning();

      if (!bumped[0]) {
        throw new AuthError("This invite code has already been used.", 400);
      }

      return user;
    });

    await setSessionCookie(created.id, false, sessionExtras(created));
    return created;
  } catch (err) {
    if (err instanceof AuthError) {
      throw err;
    }
    if (isUniqueViolation(err)) {
      throw new AuthError("An account already exists for this email. Sign in instead.", 409);
    }
    throw new AuthError("Could not redeem this invite. Try again.", 500);
  }
}

export async function signIn(input: { email: string; password: string }): Promise<User> {
  const resumed = await resumeCurrentSession();
  if (resumed) {
    return resumed;
  }

  const email = input.email.trim().toLowerCase();
  if (isMemoryPreview()) {
    throw new AuthError("Stub preview is cookie-only. Redeem the invite code again.", 401);
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  const env = getEnv();
  const role = roleForReviewUser(email, {
    adminEmails: env.adminEmails,
    stubReviewGrantsAdmin: env.stubReviewGrantsAdmin,
  });
  if (role === "admin" && user.role !== "admin") {
    await db.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, user.id));
    user.role = "admin";
  }

  await setSessionCookie(user.id, sessionAgeFlag(user.ageAttestedAt), sessionExtras(user));
  return user;
}

export async function attestAge(userId: string): Promise<User> {
  if (isMemoryPreview()) {
    const current = await getCurrentUser();
    if (!current || current.id !== userId) {
      throw new AuthError("User not found", 404);
    }
    const attested = { ...current, ageAttestedAt: current.ageAttestedAt ?? new Date(), updatedAt: new Date() };
    await setSessionCookie(attested.id, true, sessionExtras(attested));
    return attested;
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const current = existing[0];
  if (!current) {
    throw new AuthError("User not found", 404);
  }
  if (current.ageAttestedAt) {
    await setSessionCookie(current.id, true, sessionExtras(current));
    return current;
  }

  const rows = await db
    .update(users)
    .set({ ageAttestedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.ageAttestedAt)))
    .returning();
  const user = rows[0] ?? current;
  await setSessionCookie(user.id, true, sessionExtras(user));
  return user;
}

export async function createInvite(input: {
  actorId: string | null;
  note?: string;
  maxUses?: number;
  expiresAt?: Date | null;
}): Promise<{ id: string; code: string; expiresAt: Date | null }> {
  const maxUses = input.maxUses ?? 1;
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_INVITE_USES) {
    throw new AuthError("maxUses must be between 1 and 50", 400);
  }
  const expiresAt = input.expiresAt ?? null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new AuthError("Invite expiry must be in the future", 400);
  }
  if (isMemoryPreview()) {
    throw new AuthError("Invite minting needs a database.", 503);
  }

  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const rows = await db
        .insert(inviteCodes)
        .values({
          code: newInviteCode(),
          note: input.note ?? null,
          maxUses,
          createdByUserId: input.actorId,
          expiresAt,
        })
        .returning();
      const invite = rows[0];
      if (!invite) {
        throw new AuthError("Failed to create invite", 500);
      }
      return { id: invite.id, code: invite.code, expiresAt: invite.expiresAt };
    } catch (err) {
      if (isUniqueViolation(err) && attempt < 2) {
        continue;
      }
      throw err;
    }
  }
  throw new AuthError("Failed to create invite", 500);
}

export async function listInvites(): Promise<InviteCode[]> {
  if (isMemoryPreview()) {
    return [];
  }
  const db = getDb();
  return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function revokeInvite(id: string): Promise<{ id: string; revokedAt: Date }> {
  if (isMemoryPreview()) {
    throw new AuthError("Invite revoke needs a database.", 503);
  }
  const db = getDb();
  const existing = await db.select().from(inviteCodes).where(eq(inviteCodes.id, id)).limit(1);
  const invite = existing[0];
  if (!invite) {
    throw new AuthError("Invite not found", 404);
  }
  if (invite.revokedAt) {
    return { id: invite.id, revokedAt: invite.revokedAt };
  }

  const rows = await db
    .update(inviteCodes)
    .set({ revokedAt: new Date() })
    .where(and(eq(inviteCodes.id, id), isNull(inviteCodes.revokedAt)))
    .returning();
  const updated = rows[0] ?? invite;
  if (!updated.revokedAt) {
    throw new AuthError("Invite not found", 404);
  }
  return { id: updated.id, revokedAt: updated.revokedAt };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ageAttestedAt: user.ageAttestedAt?.toISOString() ?? null,
  };
}

export function publicInvite(row: InviteCode) {
  return {
    id: row.id,
    code: row.code,
    note: row.note,
    maxUses: row.maxUses,
    useCount: row.useCount,
    revokedAt: row.revokedAt,
    redeemedAt: row.redeemedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export function authResponse(user: User, extra?: { resumed?: boolean }) {
  return {
    user: publicUser(user),
    next: nextPathAfterAuth(user),
    resumed: extra?.resumed ?? false,
  };
}
