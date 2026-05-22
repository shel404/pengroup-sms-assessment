import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const grade = await prisma.grade.findUnique({ where: { id: params.id } });

  if (!grade) {
    return NextResponse.json({ error: "Grade not found" }, { status: 404 });
  }

  const updated = await prisma.grade.update({
    where: { id: params.id },
    data: { isPublished: !grade.isPublished },
  });

  return NextResponse.json(updated);
}
