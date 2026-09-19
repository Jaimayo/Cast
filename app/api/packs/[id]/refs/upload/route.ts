import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { uploadPackRef } from "@/server/packs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a still to add." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadPackRef({
      userId: user.id,
      packId: id,
      bytes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
