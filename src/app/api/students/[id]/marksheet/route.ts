import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    select: { fullName: true, studentId: true },
  });

  return NextResponse.json({
    student,
    grades,
  });
}
