## Phase 1 — Foundation & Schema

**Goal:** Get the project running with a solid, well-thought-out data model before writing a single UI component.

### 1.1 Project scaffolding

```bash
npx create-next-app@14 sms-registry --typescript --tailwind --src-dir --import-alias "@/*" --use-npm --no-git
cd sms-registry
npx shadcn@latest init -d
npm install prisma @prisma/client @prisma/adapter-pg pg
npx prisma init --datasource-provider postgresql
```

**PostgreSQL via Docker**:

```bash
docker run -d --name sms-postgres \
  -e POSTGRES_USER=smsadmin \
  -e POSTGRES_PASSWORD=smsadmin123 \
  -e POSTGRES_DB=sms_registry \
  -p 5433:5432 postgres:15
```

Then edit `.env` with the matching connection string:

```bash
DATABASE_URL="postgresql://smsadmin:smsadmin123@localhost:5433/sms_registry?schema=public"
```

Run the initial migration after the schema is designed:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 1.2 Prisma schema design

This is the most important step. Design all tables upfront:

```
Student          → id, studentId (SMS-YYYY-NNNN), fullName, email, dob, programmeId, academicYear, status, createdAt
Programme        → id, name, feeAmount
Fee              → id, studentId, totalAmount, dueDate
PaymentTransaction → id, studentId, amount, date, referenceNumber
Assessment       → id, title, module, deadline, createdById
Submission       → id, studentId, assessmentId, fileUrl, submittedAt, isLate
Grade            → id, studentId, assessmentId, numericGrade, classification, isPublished
User (role)      → id, name, role (STAFF | STUDENT), studentId (nullable FK)
```

Key design decisions to make here:

- `Fee` is separate from `PaymentTransaction` so outstanding balance = `fee.totalAmount - SUM(payments)`
- `isLate` on `Submission` is computed at insert time by comparing `submittedAt` vs `assessment.deadline`
- `Grade.isPublished` is per-student, not per-assessment — the spec explicitly requires this
- Student ID auto-generation: a DB sequence or a `prisma.$transaction` that reads the last ID and increments

### 1.3 Seed script (`prisma/seed.ts`)

Build this early so you have real data to develop against:

- 2 programmes (e.g. BSc Computer Science, BSc Business Administration) with different fee amounts
- 5 students across both programmes with mixed statuses (Enrolled, Deferred, Withdrawn, Completed, Completed)
- Fee records + some partial payments (so some students show overdue)
- 2–3 assessments with deadlines in the past and future
- Sample grades, some published and some withheld

Configure the seed command in `prisma.config.ts`:

```ts
export default defineConfig({
  migrations: {
    seed: "npx tsx ./prisma/seed.ts",
  },
});
```

Install `tsx` as a dev dependency to run the seed. The seed script imports the Prisma client with the PostgreSQL driver adapter:

```ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
```

### 1.4 Environment setup

Create `.env.example` with the `DATABASE_URL` placeholder. Verify `.gitignore` covers `.env` (Next.js scaffolds this by default). Create `public/uploads/` for file storage — served automatically by Next.js.

Create `src/lib/prisma.ts` — a shared Prisma client singleton:

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 1.5 Tailwind & shadcn theme configuration

shadcn v4 outputs `@import "shadcn/tailwind.css"` which targets Tailwind CSS 4. For Tailwind 3 compatibility, rewrite `globals.css` with standard CSS variable theming and extend `tailwind.config.ts` with the full shadcn color token palette. Install `tailwindcss-animate` as a plugin dependency. Ensure the `<body>` applies `bg-background text-foreground` via `@layer base`.

---

## Phase 2 — Student Enrolment Module

**Goal:** Complete the core Registry workflow — adding, viewing, searching, and managing students.

### 2.1 API routes (App Router)

```
POST   /api/students          → create student, auto-generate SMS-YYYY-NNNN
GET    /api/students          → list with query params: name, id, programme, status
GET    /api/students/[id]     → single student detail
PATCH  /api/students/[id]     → update status, programme, etc.
```

Student ID generation logic (inside a Prisma transaction):

```ts
const year = new Date().getFullYear();
const last = await tx.student.findFirst({
  where: { studentId: { startsWith: `SMS-${year}` } },
  orderBy: { studentId: "desc" },
});
const seq = last ? parseInt(last.studentId.split("-")[2]) + 1 : 1;
const studentId = `SMS-${year}-${String(seq).padStart(4, "0")}`;
```

### 2.2 Pages & components

- `/staff/students` → Student list with search bar, filter dropdowns (programme, status), table with overdue badge
- `/staff/students/new` → Enrolment form (validate DOB, unique email)
- `/staff/students/[id]` → Student detail view (all tabs: profile, fees, submissions, grades)

### 2.3 Edge cases to handle

- Duplicate email guard (DB unique constraint + user-friendly error)
- Status transitions that make sense (e.g. Completed → Enrolled should warn)
- Search should work across name, Student ID prefix, and programme name simultaneously

---

## Phase 3 — Fees & Payments Module

**Goal:** Track what students owe and flag overdue balances prominently.

### 3.1 API routes

```
GET    /api/students/[id]/fees          → fee record + payment history + outstanding balance
POST   /api/students/[id]/payments      → record a new payment transaction
GET    /api/dashboard/overdue           → students with outstanding balance
```

### 3.2 Balance logic

Always compute balance on the server, never trust client-side math:

```ts
const outstanding =
  fee.totalAmount - payments.reduce((sum, p) => sum + p.amount, 0);
const isOverdue = outstanding > 0 && new Date() > fee.dueDate;
```

### 3.3 Real-time balance refresh

After recording a payment, the UI must immediately reflect the new outstanding balance without a full page reload. Use `router.refresh()` or a React Query mutation invalidation so the balance updates in real time as the spec requires.

### 3.4 Pages & components

- Fee section on `/staff/students/[id]` → summary card showing total fee, amount paid, balance, and due date
- Payment form → amount, date (default today), reference number (validate uniqueness)
- Payment history table → sortable by date
- Dashboard overdue widget → flagged students sorted by balance descending, with quick-link to their profile

### 3.5 Edge cases to handle

- Overpayment guard (warn if payment would exceed outstanding balance)
- Duplicate reference number rejection
- Students with `Withdrawn` or `Completed` status still have valid fee records — don't hide them

---

## Phase 4 — Assessment & Marksheet Module (Days 7–8)

**Goal:** Complete the academic workflow — file submission, grading, and controlled results release.

### 4.1 API routes

```
POST   /api/assessments               → staff creates assessment
GET    /api/assessments               → list all, with deadline status
POST   /api/assessments/[id]/submit   → student submits/resubmits file
GET    /api/assessments/[id]/submissions → staff sees all submissions
POST   /api/grades                    → staff enters/updates grade
PATCH  /api/grades/[id]/publish       → toggle publish flag per student
GET    /api/students/[id]/marksheet   → student sees only published grades
```

### 4.2 File upload

Use Next.js route handler with `formData()` to accept PDF/DOCX uploads. Save to `/public/uploads/[assessmentId]/[studentId]-[timestamp].ext`. Validate file type server-side (check MIME type, not just extension).

### 4.3 Submission logic

```ts
const isLate = new Date() > assessment.deadline;
const existing = await prisma.submission.findUnique({
  where: { studentId_assessmentId: { studentId, assessmentId } },
});
if (existing && isLate)
  throw new Error("Deadline has passed — resubmission not allowed");
// upsert the submission record
```

### 4.4 Classification logic

```ts
function classify(grade: number): string {
  if (grade >= 70) return "Distinction";
  if (grade >= 60) return "Merit";
  if (grade >= 40) return "Pass";
  return "Fail";
}
```

### 4.5 Pages & components

- `/staff/assessments` → list with status chips (Open / Closed / Past deadline)
- `/staff/assessments/[id]` → submission table per student, grade entry inline, publish toggle per row
- `/student/assessments` → list of open assessments with upload button, late badge if applicable
- `/student/marksheet` → table of published grades only, classification badge, withheld rows hidden entirely (not shown as "pending")

### 4.6 Edge cases to handle

- File type validation (reject anything not PDF/DOCX)
- Resubmission before deadline replaces old file but keeps timestamp of latest
- Late submission accepted but visually flagged with an amber "Late" badge
- Unpublished grades must not leak through any API route accessible to students — check role on the server

---

## Phase 5 — Role Views, Polish & Submission

**Goal:** Wire up the role toggle, clean up all edge cases, write documentation, and ship.

### 5.1 Role toggle system

Since auth is optional, implement a simple session-like role switcher:

```ts
// Use a cookie or localStorage to store { role: 'STAFF' | 'STUDENT', userId: string }
// A top-bar dropdown lets you switch between "Staff View" and "Student View (select student)"
```

Build a `RoleContext` or store it in a cookie read by the layout. The student selector (when in Student view) should only show `Enrolled` students from the seed.

### 5.2 Layout & navigation

- Staff layout: sidebar with Students, Assessments, Dashboard
- Student layout: top nav with My Assessments, My Marksheet, My Fees

### 5.3 Error handling & loading states

- All forms: loading spinner during submit, disabled button to prevent double-submit
- All API routes: proper HTTP status codes (400 for validation, 404 for not found, 409 for conflicts)
- Empty states: meaningful copy when no students match a search, no submissions yet, etc.

### 5.4 README documentation

The PDF submission requirements specify a README in the repo. Write `README.md` covering:

- **How to run locally** — step-by-step: clone, install deps, configure `.env`, run migrations, seed, start dev server.
- **Environment variables** — list every variable from `.env.example` with a short description of each.
- **AI usage** — a short write-up of which AI tools have been used, which prompts/areas benefited most, and where it was needed to override or fix the AI's output.
