import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnership } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!requireOwnership(request, params.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    select: { fullName: true, studentId: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const grades = await prisma.grade.findMany({
    where: {
      studentId: params.id,
      isPublished: true,
    },
    include: {
      assessment: { select: { title: true, module: true, deadline: true } },
    },
    orderBy: { assessment: { deadline: "desc" } },
  });

  return NextResponse.json({
    student,
    grades,
  });
}
