# SMS Registry

Student Management System — Registry Module. Built as a technical assessment for PEN Global.

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **PostgreSQL 15** via Prisma 7 ORM
- **Tailwind CSS 3** with shadcn components
- **Docker** for local database

## How to Run Locally

### Prerequisites

- Node.js 18+ and npm
- Docker (or a running PostgreSQL instance)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd sms-registry
npm install

# 2. Start PostgreSQL (if using Docker)
docker run -d --name sms-postgres \
  -e POSTGRES_USER=smsadmin \
  -e POSTGRES_PASSWORD=smsadmin123 \
  -e POSTGRES_DB=sms_registry \
  -p 5433:5432 postgres:15

# 3. Configure environment
cp .env.example .env
# Edit .env if not using the Docker defaults above

# 4. Run migrations and seed
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
    └── utils.ts          # cn() utility
prisma/
├── schema.prisma         # Data model
├── seed.ts               # Demo data loader
├── config.ts             # Prisma 7 configuration
└── migrations/           # DB migration history
```

## AI Usage

This project was built with the assistance of opencode (with Deepseek v4 pro (high) as the coding model) throughout all phases, execpt for the planning. The planning was done with the help of Claude Sonnet 4.6 after multiple interations of manual review. Key areas of AI collaboration:

- **Schema design**: AI proposed the 8-model schema and validated it against the assessment spec, catching details like `isPublished` needing to be per-student (not per-assessment) and the composite unique constraint on `[studentId, assessmentId]`.
- **Seed script**: AI generated the full seed with realistic data, edge cases (partial payments for overdue scenarios, late submissions, withheld grades).
- **Development planning**: AI cross-referenced the technical assessment PDF against the development plan, identifying gaps (missing PostgreSQL setup steps, missing real-time balance refresh) and filled them.
