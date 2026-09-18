import { NextResponse } from "next/server";
import { z } from "zod";
import { publicJob, publicPack } from "@/lib/media";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { createPack, listPacks } from "@/server/packs";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  origin: z.enum(["generate_then_lock", "library_train"]).default("generate_then_lock"),
});

export async function GET() {
  try {
    const user = await requireAttestedUser();
    const packs = await listPacks(user.id);
    return NextResponse.json({ packs });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAttestedUser();
    const body = createSchema.parse(await request.json());
    const pack = await createPack({ userId: user.id, name: body.name, origin: body.origin });
    return NextResponse.json({ pack: publicPack(pack) }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
