import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const assessments = await prisma.assessment.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { deadline: "desc" },
  });

  const now = new Date();
  const enriched = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    module: a.module,
    deadline: a.deadline,
    createdBy: a.createdBy.name,
    submissionCount: a._count.submissions,
    status: a.deadline > now ? "open" : "closed",
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, module: moduleName, deadline, createdById } = body;

  const trimmedTitle = title?.trim();
  const trimmedModule = moduleName?.trim();

  if (!trimmedTitle || !trimmedModule || !deadline) {
    return NextResponse.json(
      { error: "Title, module, and deadline are required" },
      { status: 400 }
    );
  }

  if (trimmedTitle.length > 200 || trimmedModule.length > 50) {
    return NextResponse.json(
      { error: "Title must be under 200 characters, module under 50" },
      { status: 400 }
    );
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return NextResponse.json({ error: "Invalid deadline date" }, { status: 400 });
  }
  if (deadlineDate <= new Date()) {
    return NextResponse.json(
      { error: "Deadline must be in the future" },
      { status: 400 }
    );
  }

  const assessment = await prisma.assessment.create({
    data: {
      title: trimmedTitle,
      module: trimmedModule,
      deadline: deadlineDate,
      createdById: createdById || (await getDefaultStaffId()),
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json(assessment, { status: 201 });
}

async function getDefaultStaffId(): Promise<string> {
  const staff = await prisma.user.findFirst({ where: { role: "STAFF" } });
  if (!staff) throw new Error("No staff user found");
  return staff.id;
}
