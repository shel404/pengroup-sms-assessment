import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const programmes = await prisma.programme.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(programmes);
}
