import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      fee: true,
      payments: { orderBy: { date: "desc" } },
      programme: { select: { name: true, feeAmount: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const paid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = (student.fee?.totalAmount ?? 0) - paid;
  const isOverdue = outstanding > 0 && student.fee ? new Date() > student.fee.dueDate : false;

  return NextResponse.json({
    studentId: student.studentId,
    fullName: student.fullName,
    programme: student.programme.name,
    fee: student.fee,
    payments: student.payments,
    balance: {
      totalFee: student.fee?.totalAmount ?? 0,
      paid,
      outstanding,
      isOverdue,
      dueDate: student.fee?.dueDate ?? null,
    },
  });
}
