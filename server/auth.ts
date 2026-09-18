import "server-only";

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { inviteCodes, users, type User } from "@/db/schema";
import { AuthError } from "@/lib/auth-error";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/constants";
import { newInviteCode } from "@/lib/invite-code";
import { decodeSession, encodeSession } from "@/lib/session-cookie";
import { getDb } from "@/server/db";
import { getEnv, isAdminEmail } from "@/server/env";

export { AuthError } from "@/lib/auth-error";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function setSessionCookie(userId: string, ageAttested: boolean): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await encodeSession({ sub: userId, exp, age: ageAttested }, getEnv().sessionSecret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().nodeEnv === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
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
  const userId = await readSessionUserId();
  if (!userId) {
    return null;
  }
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Sign in required", 401);
  }
  return user;
}

export async function requireAttestedUser(): Promise<User> {
  const user = await requireUser();
  if (!user.ageAttestedAt) {
    throw new AuthError("Age attestation required", 403);
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAttestedUser();
  if (user.role !== "admin") {
    throw new AuthError("Admin only", 403);
  }
  return user;
}

export async function redeemInvite(input: {
  email: string;
  password: string;
  inviteCode: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const code = input.inviteCode.trim();
  if (!email || !input.password || !code) {
    throw new AuthError("Email, password, and invite code are required", 400);
  }
  if (input.password.length < 10) {
    throw new AuthError("Password must be at least 10 characters", 400);
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    throw new AuthError("An account already exists for this email. Sign in instead.", 409);
  }

  const invites = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  const invite = invites[0];
  if (!invite || invite.revokedAt) {
    throw new AuthError("This invite code is invalid.", 400);
  }
  if (invite.useCount >= invite.maxUses) {
    throw new AuthError("This invite code has already been used.", 400);
  }

  const passwordHash = await hashPassword(input.password);
  const role = isAdminEmail(email) ? "admin" : "consumer";

  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({ email, passwordHash, role })
      .returning();
    const user = inserted[0];
    if (!user) {
      throw new AuthError("Could not create user", 500);
    }

    await tx
      .update(inviteCodes)
      .set({
        useCount: sql`${inviteCodes.useCount} + 1`,
        redeemedByUserId: user.id,
        redeemedAt: new Date(),
      })
      .where(eq(inviteCodes.id, invite.id));

    return user;
  });

  await setSessionCookie(created.id, false);
  return created;
}

export async function signIn(input: { email: string; password: string }): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  if (isAdminEmail(email) && user.role !== "admin") {
    await db.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, user.id));
    user.role = "admin";
  }

  await setSessionCookie(user.id, Boolean(user.ageAttestedAt));
  return user;
}

export async function attestAge(userId: string): Promise<User> {
  const db = getDb();
  const rows = await db
    .update(users)
    .set({ ageAttestedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  const user = rows[0];
  if (!user) {
    throw new AuthError("User not found", 404);
  }
  await setSessionCookie(user.id, true);
  return user;
}

export async function createInvite(input: {
  actorId: string | null;
  note?: string;
  maxUses?: number;
}): Promise<{ id: string; code: string }> {
  const db = getDb();
  const code = newInviteCode();
  const rows = await db
    .insert(inviteCodes)
    .values({
      code,
      note: input.note ?? null,
      maxUses: input.maxUses ?? 1,
      createdByUserId: input.actorId,
    })
    .returning();
  const invite = rows[0];
  if (!invite) {
    throw new Error("Failed to create invite");
  }
  return { id: invite.id, code: invite.code };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ageAttestedAt: user.ageAttestedAt?.toISOString() ?? null,
  };
}
