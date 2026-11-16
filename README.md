# ACME Salary Management

A web tool for ACME's HR Manager to manage salaries for 10,000 employees across 8 countries and answer "how do we pay people?" without spreadsheets.

- **Employees:** search, filter by country and job title, sort by name or salary, add, edit, delete.
- **Insights:** headcount and USD payroll for the org; min, median, average and max salary per country in local currency; pay by job title within any country.

**Live demo:** _link added after deploy_
**Video walkthrough:** _link added after recording_

## Run it

Requires Node 20+.

```bash
npm install
npm run seed      # creates data/salary.db with 10,000 employees (about 0.1 s)
npm run dev       # http://localhost:3000
```

```bash
npm test          # 34 unit tests, under a second
npx tsc --noEmit  # type check
npm run lint
```

Production: `npm run build && npm start`. `start` seeds the database only if it is empty, then serves the app. Set `DATABASE_PATH` to put the database file somewhere else.

## Stack

TypeScript, Next.js 15 (App Router) for API and UI, SQLite via better-sqlite3, Zod for validation, Tailwind CSS, Vitest.

## Project layout

```
src/
  server/
    domain/        countries + currency, employee schema, salary stats (pure)
    repositories/  SQL for the employees table
    services/      business rules: validation, paging defaults, insights
    seed/          deterministic generator for realistic employees
    container.ts   wires real dependencies
    http.ts        maps service errors to HTTP status codes
  app/
    api/           thin route handlers
    page.tsx       employees screen
    insights/      insights screen (server component)
  components/      UI pieces
scripts/seed.ts    seed command
docs/              requirements, architecture, trade-offs, AI workflow
```

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/employees?search=&country=&jobTitle=&sort=name\|salary&order=asc\|desc&page=&pageSize=` | Paginated, page size max 100 |
| POST | `/api/employees` | 201 with the employee, or 400 with `fieldErrors` |
| GET / PUT / DELETE | `/api/employees/:id` | 404 if missing, DELETE returns 204 |
| GET | `/api/insights?country=DE` | Overview, per-country stats, and per-title stats for the given country |
| GET | `/api/meta` | Countries and job titles for filters and forms |

## Docs

- [Requirements](docs/REQUIREMENTS.md): scope, and what is left out and why
- [Architecture](docs/ARCHITECTURE.md): layers, diagram, request flow
- [Trade-offs and performance](docs/TRADEOFFS.md)
- [How AI was used](docs/AI-WORKFLOW.md): working rules and the prompts for each step
