import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true } },
      submissions: {
        include: {
          student: { select: { id: true, fullName: true, studentId: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      grades: {
        include: {
          student: { select: { id: true } },
        },
      },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Get all enrolled students for this assessment's programme (simplified: all students)
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, studentId: true },
  });

  // Build a map: studentId → { submission, grade }
  const studentMap = new Map(
    students.map((s) => [
      s.id,
      {
        student: s,
        submission: assessment.submissions.find(
          (sub) => sub.studentId === s.id
        ) || null,
        grade:
          assessment.grades.find((g) => g.studentId === s.id) || null,
      },
    ])
  );

  const result = Array.from(studentMap.values());

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      module: assessment.module,
      deadline: assessment.deadline,
      createdBy: assessment.createdBy.name,
    },
    entries: result,
  });
}
