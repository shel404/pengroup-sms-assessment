import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      programme: true,
      fee: true,
      payments: { orderBy: { date: "desc" } },
      submissions: {
        include: { assessment: { select: { title: true, module: true } } },
        orderBy: { submittedAt: "desc" },
      },
      grades: {
        include: { assessment: { select: { title: true, module: true } } },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const paid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = (student.fee?.totalAmount ?? 0) - paid;
  const isOverdue = outstanding > 0 && student.fee ? new Date() > student.fee.dueDate : false;

  return NextResponse.json({
    ...student,
    balance: { paid, outstanding, isOverdue },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { fullName, email, dob, programmeId, academicYear, status } = body;

  const student = await prisma.student.findUnique({ where: { id: params.id } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Status transition guard
  const validTransitions: Record<string, string[]> = {
    Enrolled: ["Deferred", "Withdrawn", "Completed"],
    Deferred: ["Enrolled", "Withdrawn"],
    Withdrawn: ["Enrolled"],
    Completed: [],
  };

  if (status && status !== student.status) {
    const allowed = validTransitions[student.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${student.status} to ${status}` },
        { status: 400 }
      );
    }
  }

  // Check email uniqueness if changed
  if (email && email !== student.email) {
    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A student with this email already exists" },
        { status: 409 }
      );
    }
  }

  // Validate programme if changed
  if (programmeId) {
    const programme = await prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
  }

  const updated = await prisma.student.update({
    where: { id: params.id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email }),
      ...(dob !== undefined && { dob: new Date(dob) }),
      ...(programmeId !== undefined && { programmeId }),
      ...(academicYear !== undefined && { academicYear }),
      ...(status !== undefined && { status }),
    },
    include: {
      programme: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
