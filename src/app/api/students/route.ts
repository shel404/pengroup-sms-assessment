import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || undefined;
  const id = searchParams.get("id") || undefined;
  const programme = searchParams.get("programme") || undefined;
  const status = searchParams.get("status") || undefined;

  const where: Record<string, unknown> = {};

  if (name) {
    where.OR = [
      { fullName: { contains: name, mode: "insensitive" } },
      { studentId: { startsWith: name, mode: "insensitive" } },
    ];
  }
  if (id) {
    where.studentId = { startsWith: id, mode: "insensitive" };
  }
  if (programme && programme !== "all") {
    where.programme = { name: { contains: programme, mode: "insensitive" } };
  }
  if (status && status !== "all") {
    where.status = status;
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      programme: { select: { name: true } },
      fee: { select: { totalAmount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = students.map((s) => {
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = (s.fee?.totalAmount ?? 0) - paid;
    const isOverdue = outstanding > 0 && s.fee ? new Date() > s.fee.dueDate : false;

    return {
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      dob: s.dob,
      academicYear: s.academicYear,
      status: s.status,
      programmeName: s.programme.name,
      outstandingBalance: outstanding,
      isOverdue,
      createdAt: s.createdAt,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fullName, email, dob, programmeId, academicYear, status } = body;

  if (!fullName || !email || !dob || !programmeId || !academicYear) {
    return NextResponse.json(
      { error: "Missing required fields: fullName, email, dob, programmeId, academicYear" },
      { status: 400 }
    );
  }

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedYear = academicYear.trim();

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return NextResponse.json(
      { error: "Full name must be between 2 and 100 characters" },
      { status: 400 }
    );
  }

  if (!/^\d{4}\/\d{4}$/.test(trimmedYear)) {
    return NextResponse.json(
      { error: "Academic year must be in format YYYY/YYYY (e.g. 2026/2027)" },
      { status: 400 }
    );
  }

  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) {
    return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
  }
  if (dobDate > new Date()) {
    return NextResponse.json(
      { error: "Date of birth cannot be in the future" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Check duplicate email
  const existing = await prisma.student.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "A student with this email already exists" },
      { status: 409 }
    );
  }

  // Validate programme exists
  const programme = await prisma.programme.findUnique({ where: { id: programmeId } });
  if (!programme) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  // Auto-generate student ID in a transaction
  const student = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const last = await tx.student.findFirst({
      where: { studentId: { startsWith: `SMS-${year}` } },
      orderBy: { studentId: "desc" },
    });
    const seq = last ? parseInt(last.studentId.split("-")[2]) + 1 : 1;
    const studentId = `SMS-${year}-${String(seq).padStart(4, "0")}`;

    return tx.student.create({
      data: {
        studentId,
        fullName: trimmedName,
        email: trimmedEmail,
        dob: dobDate,
        programmeId,
        academicYear: trimmedYear,
        status: status || "Enrolled",
      },
      include: {
        programme: { select: { name: true, feeAmount: true } },
      },
    });
  });

  // Create user account for the student
  await prisma.user.create({
    data: {
      name: student.fullName,
      role: "STUDENT",
      studentId: student.id,
    },
  });

  // Auto-create fee record based on programme
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 6);
  await prisma.fee.create({
    data: {
      studentId: student.id,
      totalAmount: student.programme.feeAmount,
      dueDate,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
