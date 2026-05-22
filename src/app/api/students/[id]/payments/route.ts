import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { amount, referenceNumber, date } = body;

  if (!amount || !referenceNumber) {
    return NextResponse.json(
      { error: "Amount and reference number are required" },
      { status: 400 }
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: { fee: true, payments: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (!student.fee) {
    return NextResponse.json(
      { error: "No fee record exists for this student" },
      { status: 400 }
    );
  }

  const paid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = student.fee.totalAmount - paid;

  if (parsedAmount > outstanding) {
    return NextResponse.json(
      {
        error: `Payment exceeds outstanding balance. Outstanding: £${outstanding.toFixed(2)}`,
      },
      { status: 400 }
    );
  }

  const existingRef = await prisma.paymentTransaction.findUnique({
    where: { referenceNumber },
  });
  if (existingRef) {
    return NextResponse.json(
      { error: "A payment with this reference number already exists" },
      { status: 409 }
    );
  }

  const payment = await prisma.paymentTransaction.create({
    data: {
      studentId: params.id,
      amount: parsedAmount,
      referenceNumber,
      date: date ? new Date(date) : new Date(),
    },
  });

  const newOutstanding = outstanding - parsedAmount;

  return NextResponse.json(
    {
      payment,
      balance: {
        paid: paid + parsedAmount,
        outstanding: newOutstanding,
        isOverdue:
          newOutstanding > 0 && new Date() > student.fee.dueDate,
      },
    },
    { status: 201 }
  );
}
