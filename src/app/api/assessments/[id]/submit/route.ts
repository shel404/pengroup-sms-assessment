import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireOwnership } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(request);
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  // Derive studentId from auth header, fall back to form field for backward compat
  const studentId = session?.userId || (formData.get("studentId") as string | null);

  if (!file || !studentId) {
    return NextResponse.json(
      { error: "File and studentId are required" },
      { status: 400 }
    );
  }

  if (!requireOwnership(request, studentId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File cannot be empty" }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File size must be under 10MB" },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are allowed" },
      { status: 400 }
    );
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Validate student exists (protects against stale localStorage user IDs)
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json(
      { error: "Student not found. Your session may be stale — switch to Staff then back to Student." },
      { status: 404 }
    );
  }

  const isLate = new Date() > assessment.deadline;

  const existing = await prisma.submission.findUnique({
    where: {
      studentId_assessmentId: {
        studentId,
        assessmentId: params.id,
      },
    },
  });

  if (existing && isLate) {
    return NextResponse.json(
      { error: "Deadline has passed — resubmission not allowed" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "bin";
  const timestamp = Date.now();
  const dir = path.join("public", "uploads", params.id);
  await mkdir(dir, { recursive: true });
  const filename = `${studentId}-${timestamp}.${ext}`;
  const filePath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${params.id}/${filename}`;

  const submission = await prisma.submission.upsert({
    where: {
      studentId_assessmentId: {
        studentId,
        assessmentId: params.id,
      },
    },
    update: {
      fileUrl,
      submittedAt: new Date(),
      isLate,
    },
    create: {
      studentId,
      assessmentId: params.id,
      fileUrl,
      isLate,
    },
  });

  return NextResponse.json(submission, { status: existing ? 200 : 201 });
}
