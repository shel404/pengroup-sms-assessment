import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function classify(grade: number): string {
  if (grade >= 70) return "Distinction";
  if (grade >= 60) return "Merit";
  if (grade >= 40) return "Pass";
  return "Fail";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, assessmentId, numericGrade } = body;

  if (studentId === undefined || assessmentId === undefined || numericGrade === undefined) {
    return NextResponse.json(
      { error: "studentId, assessmentId, and numericGrade are required" },
      { status: 400 }
    );
  }

  const grade = parseInt(numericGrade);
  if (isNaN(grade) || grade < 0 || grade > 100) {
    return NextResponse.json(
      { error: "Grade must be a number between 0 and 100" },
      { status: 400 }
    );
  }

  const classification = classify(grade);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const result = await prisma.grade.upsert({
    where: {
      studentId_assessmentId: { studentId, assessmentId },
    },
    update: { numericGrade: grade, classification },
    create: { studentId, assessmentId, numericGrade: grade, classification },
  });

  return NextResponse.json(result);
}
