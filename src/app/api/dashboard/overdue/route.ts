import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const students = await prisma.student.findMany({
    include: {
      fee: true,
      payments: true,
      programme: { select: { name: true } },
    },
  });

  const overdue = students
    .map((s) => {
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = (s.fee?.totalAmount ?? 0) - paid;
      const isOverdue = balance > 0 && s.fee ? new Date() > s.fee.dueDate : false;
      return { ...s, balance, isOverdue };
    })
    .filter((s) => s.isOverdue)
    .sort((a, b) => b.balance - a.balance)
    .map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      programme: s.programme.name,
      balance: s.balance,
    }));

  return NextResponse.json(overdue);
}
