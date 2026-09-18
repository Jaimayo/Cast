import { NextResponse } from "next/server";
import { COMPOSER_CHIPS } from "@/lib/chips";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    pose: COMPOSER_CHIPS.pose.map(({ id, label }) => ({ id, label })),
    outfit: COMPOSER_CHIPS.outfit.map(({ id, label }) => ({ id, label })),
    scene: COMPOSER_CHIPS.scene.map(({ id, label }) => ({ id, label })),
    lighting: COMPOSER_CHIPS.lighting.map(({ id, label }) => ({ id, label })),
    body: COMPOSER_CHIPS.body.map(({ id, label }) => ({ id, label })),
  });
}
