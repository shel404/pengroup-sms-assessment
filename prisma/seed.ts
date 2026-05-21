import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function generateStudentId(year: number, seq: number): string {
  return `SMS-${year}-${String(seq).padStart(4, "0")}`;
}

function classify(grade: number): string {
  if (grade >= 70) return "Distinction";
  if (grade >= 60) return "Merit";
  if (grade >= 40) return "Pass";
  return "Fail";
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.student.deleteMany();
  await prisma.programme.deleteMany();

  // ─── Programmes ────────────────────────────────────

  const csProgramme = await prisma.programme.create({
    data: { name: "BSc Computer Science", feeAmount: 4500.0 },
  });

  const baProgramme = await prisma.programme.create({
    data: { name: "BSc Business Administration", feeAmount: 3800.0 },
  });

  console.log("Created 2 programmes");

  // ─── Students ──────────────────────────────────────

  const currentYear = new Date().getFullYear();

  const students = await Promise.all([
    prisma.student.create({
      data: {
        studentId: generateStudentId(currentYear, 1),
        fullName: "Alice Kamau",
        email: "alice.kamau@example.com",
        dob: new Date("2002-03-15"),
        academicYear: `${currentYear}/${currentYear + 1}`,
        status: "Enrolled",
        programmeId: csProgramme.id,
      },
    }),
    prisma.student.create({
      data: {
        studentId: generateStudentId(currentYear, 2),
        fullName: "Brian Ochieng",
        email: "brian.ochieng@example.com",
        dob: new Date("2001-07-22"),
        academicYear: `${currentYear}/${currentYear + 1}`,
        status: "Enrolled",
        programmeId: csProgramme.id,
      },
    }),
    prisma.student.create({
      data: {
        studentId: generateStudentId(currentYear, 3),
        fullName: "Cynthia Wanjiku",
        email: "cynthia.wanjiku@example.com",
        dob: new Date("2002-11-08"),
        academicYear: `${currentYear}/${currentYear + 1}`,
        status: "Deferred",
        programmeId: baProgramme.id,
      },
    }),
    prisma.student.create({
      data: {
        studentId: generateStudentId(currentYear, 4),
        fullName: "David Mwangi",
        email: "david.mwangi@example.com",
        dob: new Date("2000-01-30"),
        academicYear: `${currentYear - 1}/${currentYear}`,
        status: "Withdrawn",
        programmeId: baProgramme.id,
      },
    }),
    prisma.student.create({
      data: {
        studentId: generateStudentId(currentYear, 5),
        fullName: "Esther Nekesa",
        email: "esther.nekesa@example.com",
        dob: new Date("2001-05-12"),
        academicYear: `${currentYear - 1}/${currentYear}`,
        status: "Completed",
        programmeId: csProgramme.id,
      },
    }),
  ]);

  console.log("Created 5 students");

  // ─── Users ─────────────────────────────────────────

  const staffUser = await prisma.user.create({
    data: { name: "Dr. Registrar", role: "STAFF" },
  });

  await Promise.all(
    students.map((s) =>
      prisma.user.create({
        data: { name: s.fullName, role: "STUDENT", studentId: s.id },
      })
    )
  );

  console.log("Created users (1 staff + 5 students)");

  // ─── Fees ──────────────────────────────────────────

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const fee1 = await prisma.fee.create({
    data: {
      studentId: students[0].id,
      totalAmount: csProgramme.feeAmount,
      dueDate: oneMonthAgo,
    },
  });

  const fee2 = await prisma.fee.create({
    data: {
      studentId: students[1].id,
      totalAmount: csProgramme.feeAmount,
      dueDate: nextMonth,
    },
  });

  const fee3 = await prisma.fee.create({
    data: {
      studentId: students[2].id,
      totalAmount: baProgramme.feeAmount,
      dueDate: sixMonthsAgo,
    },
  });

  const fee4 = await prisma.fee.create({
    data: {
      studentId: students[3].id,
      totalAmount: baProgramme.feeAmount,
      dueDate: sixMonthsAgo,
    },
  });

  const fee5 = await prisma.fee.create({
    data: {
      studentId: students[4].id,
      totalAmount: csProgramme.feeAmount,
      dueDate: sixMonthsAgo,
    },
  });

  console.log("Created fee records");

  // ─── Payments (partial for some, full for others) ──

  // Alice: paid only part → overdue
  await prisma.paymentTransaction.create({
    data: {
      studentId: students[0].id,
      amount: 2000.0,
      date: new Date("2025-01-15"),
      referenceNumber: "PAY-2025-001",
    },
  });

  // Brian: paid full → not overdue
  await prisma.paymentTransaction.create({
    data: {
      studentId: students[1].id,
      amount: csProgramme.feeAmount,
      date: new Date("2025-02-10"),
      referenceNumber: "PAY-2025-002",
    },
  });

  // Cynthia: no payment at all → overdue
  // (intentionally empty)

  // David: paid part → overdue
  await prisma.paymentTransaction.create({
    data: {
      studentId: students[3].id,
      amount: 1500.0,
      date: new Date("2024-11-20"),
      referenceNumber: "PAY-2024-001",
    },
  });

  // Esther: paid full → not overdue
  await prisma.paymentTransaction.create({
    data: {
      studentId: students[4].id,
      amount: csProgramme.feeAmount,
      date: new Date("2024-08-05"),
      referenceNumber: "PAY-2024-002",
    },
  });

  console.log("Created payment transactions");

  // ─── Assessments ───────────────────────────────────

  const pastDeadline = new Date();
  pastDeadline.setDate(pastDeadline.getDate() - 7);

  const futureDeadline = new Date();
  futureDeadline.setDate(futureDeadline.getDate() + 14);

  const farFutureDeadline = new Date();
  farFutureDeadline.setDate(farFutureDeadline.getDate() + 30);

  const assessment1 = await prisma.assessment.create({
    data: {
      title: "Introduction to Algorithms — Problem Set 1",
      module: "CS101",
      deadline: pastDeadline,
      createdById: staffUser.id,
    },
  });

  const assessment2 = await prisma.assessment.create({
    data: {
      title: "Data Structures — Assignment 2",
      module: "CS201",
      deadline: futureDeadline,
      createdById: staffUser.id,
    },
  });

  const assessment3 = await prisma.assessment.create({
    data: {
      title: "Business Ethics — Essay",
      module: "BA101",
      deadline: pastDeadline,
      createdById: staffUser.id,
    },
  });

  console.log("Created 3 assessments");

  // ─── Submissions ───────────────────────────────────

  // Alice submitted to past-deadline assessment (on time)
  await prisma.submission.create({
    data: {
      studentId: students[0].id,
      assessmentId: assessment1.id,
      fileUrl: "/uploads/assignments/alice_cs101.pdf",
      submittedAt: new Date(pastDeadline.getTime() - 24 * 60 * 60 * 1000),
      isLate: false,
    },
  });

  // Brian submitted late to assessment1
  await prisma.submission.create({
    data: {
      studentId: students[1].id,
      assessmentId: assessment1.id,
      fileUrl: "/uploads/assignments/brian_cs101.pdf",
      submittedAt: new Date(pastDeadline.getTime() + 2 * 24 * 60 * 60 * 1000),
      isLate: true,
    },
  });

  // Cynthia submitted to BA101
  await prisma.submission.create({
    data: {
      studentId: students[2].id,
      assessmentId: assessment3.id,
      fileUrl: "/uploads/assignments/cynthia_ba101.pdf",
      submittedAt: new Date(pastDeadline.getTime() - 3 * 24 * 60 * 60 * 1000),
      isLate: false,
    },
  });

  // Esther submitted to assessment1
  await prisma.submission.create({
    data: {
      studentId: students[4].id,
      assessmentId: assessment1.id,
      fileUrl: "/uploads/assignments/esther_cs101.pdf",
      submittedAt: new Date(pastDeadline.getTime() - 4 * 24 * 60 * 60 * 1000),
      isLate: false,
    },
  });

  console.log("Created submissions");

  // ─── Grades ────────────────────────────────────────

  // Alice: good grade, published
  await prisma.grade.create({
    data: {
      studentId: students[0].id,
      assessmentId: assessment1.id,
      numericGrade: 72,
      classification: classify(72),
      isPublished: true,
    },
  });

  // Brian: low grade, published
  await prisma.grade.create({
    data: {
      studentId: students[1].id,
      assessmentId: assessment1.id,
      numericGrade: 35,
      classification: classify(35),
      isPublished: true,
    },
  });

  // Cynthia: decent grade, withheld
  await prisma.grade.create({
    data: {
      studentId: students[2].id,
      assessmentId: assessment3.id,
      numericGrade: 58,
      classification: classify(58),
      isPublished: false,
    },
  });

  // Esther: distinction, published
  await prisma.grade.create({
    data: {
      studentId: students[4].id,
      assessmentId: assessment1.id,
      numericGrade: 85,
      classification: classify(85),
      isPublished: true,
    },
  });

  console.log("Created grades");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
