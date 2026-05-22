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

  if (!title || !moduleName || !deadline) {
    return NextResponse.json(
      { error: "Title, module, and deadline are required" },
      { status: 400 }
    );
  }

  const assessment = await prisma.assessment.create({
    data: {
      title,
      module: moduleName,
      deadline: new Date(deadline),
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
