# SMS Registry

Student Management System — Registry Module. Built as a technical assessment for PEN Global.

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **PostgreSQL 15** via Prisma 7 ORM
- **Tailwind CSS 4** with shadcn components
- **Docker** for containerized deployment

## Quick Start (Docker)

```bash
git clone https://github.com/shel404/pengroup-sms-assessment.git
cd sms-registry
docker compose up --build
```

This starts PostgreSQL, runs migrations and seed, then serves the app at [http://localhost:3333](http://localhost:3333).

To stop: `docker compose down`. To wipe the database: `docker compose down -v`.

## How to Run Locally (without Docker)

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15 ([download](https://www.postgresql.org/download/))

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open [http://localhost:3333](http://localhost:3333).

## Environment Variables

| Variable       | Description                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string. Format: `postgresql://<user>:<password>@<host>:<port>/<db>?schema=public` |

See `.env.example` for the placeholder.

## Seed Data

Running `npx prisma db seed` loads:

- **2 programmes**: BSc Computer Science (fee £4,500), BSc Business Administration (fee £3,800)
- **5 students** with student IDs like `SMS-2026-0001`, mixed statuses (Enrolled, Deferred, Withdrawn, Completed)
- **Fee records & payments**: partial payments create overdue scenarios
- **3 assessments**: past-deadline, open, and future
- **Submissions & grades**: some on-time, one late, some grades published, some withheld
- **Users**: 1 staff + 5 student accounts for the role toggle

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
├── components/ui/        # shadcn components
├── generated/prisma/     # Prisma client output
└── lib/
    ├── prisma.ts         # Shared client singleton
    ├── auth.ts           # Server-side role/ownership checks
    ├── role-context.tsx   # Role toggle context & provider
    └── utils.ts          # cn() utility
prisma/
├── schema.prisma         # Data model
├── seed.ts               # Demo data loader
├── config.ts             # Prisma 7 configuration
└── migrations/           # DB migration history
scripts/
└── entrypoint.sh         # Docker startup script
```

## AI Usage

**Tool:** opencode (coding agent with DeepSeek v4-pro model) for
implementation; Claude Sonnet 4.6 for planning and design reviews.

**Approach:** AI was used as a pair programmer throughout all phases — generating
code, debugging build errors, and iterating on fixes. Every AI output was reviewed,
tested, and adjusted where needed.

### Phase-by-phase breakdown

**Phase 1 — Foundation & Schema**

- Scaffolding: AI handled `create-next-app`, shadcn init, Prisma setup.
- Schema: AI designed the 8-model schema with FK relationships and composite keys.
- Build fixes: shadcn-ui deprecation → switched to `shadcn`; Prisma 7 driver adapter;
  Tailwind 3/4 CSS conflicts — AI diagnosed each error and applied fixes.
- Seed script: generated realistic demo data with edge cases (partial payments for
  overdue scenarios, late submissions, withheld grades).

**Phase 2 — Student Enrolment**

- API routes with server-side validation, ID auto-generation, status transitions.
- Student list with debounced search, filter dropdowns, overdue badges.
- Enrolment form with duplicate email guard, programme selection, auto-fee creation.

**Phase 3 — Fees & Payments**

- Payment recording with overpayment guard and duplicate reference checks.
- Real-time balance refresh via client-side refetch after mutation.
- Sortable payment history table (Date/Amount columns).

**Phase 4 — Assessment & Marksheet**

- File upload with MIME validation (PDF/DOCX only), late submission detection.
- Grade entry with inline save, publish/withhold toggle with confirmation dialog.
- Marksheet API filtering unpublished grades server-side — students see only their own
  published results.

**Phase 5 — Role Views & Polish**

- RoleContext with localStorage persistence and URL-path correction.
- Server-side ownership checks via auth headers — no grade leaks through any
  student-accessible API.
- Pre-submission audit: AI identified 3 critical data leak paths and fixed them.
- Publish/withhold confirmation modal, loading states on all pages, 404 handling.

**Docker & DevOps**

- Multi-stage Dockerfile, docker-compose, entrypoint script with health checks.
- Tailwind 3 → 4 upgrade: migrated `tailwind.config.ts` to `@theme` in CSS,
  updated PostCSS config, dropped `tailwindcss-animate`.

### Where AI required correction

These fixes were identified through manual testing and review, then applied:

**Phase 1 — Scaffolding issues**

- shadcn v4 generated Tailwind 4 CSS (`@import "shadcn/tailwind.css"`) that broke
  the Tailwind 3 build — `globals.css` was manually rewritten with standard Tailwind
  3 + CSS variable theming.
- shadcn init added `import { Geist } from "next/font/google"` which isn't exported
  in Next.js 14 — removed and used local fonts only.
- Prisma 7 requires a driver adapter (`@prisma/adapter-pg`) — the dev plan assumed
  plain `new PrismaClient()`. Installed the adapter and updated the singleton.
- Prisma 7 stores seed config in `prisma.config.ts` under `migrations.seed`, not
  in `package.json` — config location was corrected.

**Phase 2 — Search and filters**

- The student list search only matched by name, not student ID. When typing an ID
  like `SMS-2026-0001`, no results appeared. Fixed by changing the API to `OR`
  across both `fullName` (contains) and `studentId` (startsWith).
- Selecting "All statuses" or "All programmes" in the filter dropdowns sent the
  literal string `"all"` to the API, returning zero results. Fixed by filtering out
  the `"all"` value on both the client and server side.

**Phase 3 — Missing endpoints and UI**

- The `/api/students/[id]/fees` endpoint was missing from the initial implementation
  — created on request.
- The payment history table was not sortable — added clickable Date/Amount column
  headers with ascending/descending toggles.

**Phase 4 — Confirmation and data leaks**

- Publishing/withholding a grade happened immediately on click with no confirmation
  — added a confirm dialog showing the student name and action.
- Pre-submission audit found 3 critical data leaks: marksheet, fees, and submission
  endpoints had no server-side ownership checks. Fixed by adding `requireOwnership()`
  server-side via auth headers.

**Role toggle bugs**

- The sidebar "Switch to Student" dropdown overflowed the sidebar width — changed
  the layout to stack the label and dropdown vertically.
- After refreshing the page on `/staff`, the role toggle sometimes showed
  "Switch to Staff" (Student mode) despite the user being on staff pages. Root cause:
  localStorage had stale `STUDENT` role from a previous session. Fixed by adding
  URL-path validation on load — if the path starts with `/staff` but stored role is
  `STUDENT`, the context auto-corrects to `STAFF`.

**Docker and build**

- Docker build failed because `/api/programmes` and `/api/dashboard/overdue` were
  being statically prerendered without a database connection. Fixed by adding
  `export const dynamic = "force-dynamic"` to both routes.
- Tailwind 3 → 4 upgrade required migration from `tailwind.config.ts` + `@tailwind`
  directives to `@import "tailwindcss"` + `@theme` blocks in CSS, and switching
  PostCSS from `tailwindcss` to `@tailwindcss/postcss`.

**Base UI type incompatibilities**

- `asChild` prop was used on Button, DialogTrigger but doesn't exist in Base UI
  (the backing library for shadcn v4) — rewired to use `render` prop or direct
  component wrapping.
- `onValueChange` on Select/Combobox receives `string | null` in Base UI but React
  state setters expect `string` — added `?? ""` to all handlers.
