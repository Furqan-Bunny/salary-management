# ACME Salary Management

A web tool for ACME's HR Manager to manage salaries for 10,000 employees across 8 countries, and to answer **"how do we pay people?"** in the three ways that matter: what we pay, whether it matches our own pay structure, and whether it is fair.

Scope came from researching what compensation tools HR teams actually buy (Pave, Carta, HiBob, Workday) and what is changing in regulation. See [docs/RESEARCH.md](docs/RESEARCH.md).

**Live demo:** https://salary-management-rhey.onrender.com (free tier: the first visit after idle takes about a minute while it wakes up and re-seeds) · **Video walkthrough:** _link added after recording_

## What it does

**Employees**
- Search by name, email or employee code; filter by country, job title, band position and status; sort by name, salary, hire date or **compa-ratio**. Filters live in the URL, so any view can be bookmarked or linked.
- Every salary is shown against its **pay band**, with the compa-ratio (salary ÷ band midpoint) highlighted when someone is below or above band.
- Employee page: band bar (min, mid, max), compa-ratio, range penetration, tenure, last increase, and the full **salary history**.
- **Salary changes are recorded as events** with an effective date and reason (merit, promotion, market adjustment, correction). The form shows the % change and warns when the new salary falls outside the band. Old values are never overwritten.
- Edits are protected by **optimistic locking**: if someone else saved first, you are told to reload instead of overwriting their change.
- Deactivate and reactivate (no hard delete, history is kept). **CSV export** of any filtered list.

**Insights**
- Org overview: headcount, countries, payroll in USD, share of people paid outside their band.
- Salary by country in local currency, with medians compared in USD.
- **Band health** per country, each count linking to the list of those people.
- **Gender pay gap** by job title, flagged at **5%** (the EU Pay Transparency Directive threshold), groups under 10 suppressed.
- **Pay compression**: recent hires vs. people with 3+ years in the same role.
- Salary by job title against the band, and by department.

**Pay bands**
- View and edit min / mid / max per job title per country; every compa-ratio updates immediately.

## Run it

Requires Node 20+.

```bash
npm install
npm run seed     # 10,000 employees, ~48,000 salary changes, 136 bands, in about 2 s
npm run dev      # http://localhost:3000
```

```bash
npm test             # 75 tests (unit + API integration), about 1 s
npm run typecheck
npm run lint
```

Production: `npm run build && npm start` (seeds only if the database is empty). Or `docker build -t salary . && docker run -p 3000:3000 salary`. `DATABASE_PATH` sets where the SQLite file lives.

## Stack

TypeScript · Next.js 15 (App Router) for API and UI · SQLite (better-sqlite3) · Zod · Tailwind CSS · Vitest · GitHub Actions CI · Docker.

## How the code is organised

```
src/server/            all business logic, no Next.js imports
  domain/              countries + currency, schemas, compa-ratio, pay gap, stats (pure)
  repositories/        SQL for employees, salary_changes, salary_bands
  services/            salary change rules, locking, CSV, insights
  seed/                deterministic generator
  container.ts         wires real dependencies
  http.ts              maps service errors to 400 / 404 / 409
src/app/api/           thin route handlers (+ integration tests)
src/app/               employees, employee page, insights, bands
src/components/        UI pieces
scripts/seed.ts        seed command
docs/                  research, requirements, architecture, trade-offs, seed data, AI workflow
```

The commit history is test-first: each layer has a `test: ... (red)` commit followed by the `feat: ...` commit that makes it pass.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/employees` | `search, country, department, jobTitle, band (below/within/above/none), status (active/inactive/all), sort (name/salary/compa/hireDate), order, page, pageSize ≤ 100` |
| POST | `/api/employees` | Profile + starting salary. 201, or 400 with `fieldErrors` |
| GET / PATCH | `/api/employees/:id` | PATCH needs `version`; 409 if stale |
| GET / POST | `/api/employees/:id/salary` | History (newest first) / record a change. 409 if inactive |
| PUT | `/api/employees/:id/status` | `{ "status": "active" \| "inactive" }` |
| GET | `/api/employees/export` | CSV with the same filters as the list |
| GET / PUT | `/api/bands`, `/api/bands/:id` | List by `country` / update min, mid, max |
| GET | `/api/insights?country=DE` | Overview, by country, band health, and equity / compression / titles / departments for one country |
| GET | `/api/meta` | Countries, genders, reasons, job titles, departments |

## Docs

- [Research](docs/RESEARCH.md): what real compensation tools do, with sources
- [Requirements](docs/REQUIREMENTS.md): scope, rules, and what is left out and why
- [Architecture](docs/ARCHITECTURE.md): layers, diagram, data model, key flows
- [Trade-offs and performance](docs/TRADEOFFS.md)
- [Seed data](docs/SEED_DATA.md): how the fictional company is generated, and what was planted on purpose
- [How AI was used](docs/AI-WORKFLOW.md): working rules, prompts and review
