# Trade-offs and performance

## Decisions

**Salary changes are events, not edits.** Profile fields are edited in place; salary is only ever changed by appending to `salary_changes`. It costs one more table and a transaction, and buys an audit trail, "last increase" and the ability to answer "what did we pay her in 2024?". This is how HR systems work and the main thing Excel cannot do.

**Bands as ACME's own structure, not market data.** Real tools (Pave, Carta) price bands from market benchmarks, which needs a paid data feed. Here bands are editable by HR and seeded from a simple model. The metrics (compa-ratio, range penetration, out-of-band) are the same either way.

**Pay equity: median gap, 5% flag, minimum group of 10.** The median gap is what UK and EU reporting use. The 5% line comes from the EU Pay Transparency Directive. Groups under 10 on either side are hidden: below that one person can move a median by several percent, and small groups risk identifying individuals. Even so, some flags come from random variation, which is why the directive lets employers justify a gap; the tool's job is to show HR where to look.

**Compression: median compa-ratio of hires under 1 year vs. 3+ years, with a 0.03 margin.** Comparing compa-ratios rather than raw salaries removes the effect of the band itself. The margin stops tiny, meaningless differences from being flagged.

**One Next.js app, not a separate backend.** Both sides are TypeScript; one deployable keeps setup to one command. The logic in `src/server` has no Next.js imports, so splitting it out later means moving a folder.

**SQLite.** Allowed by the brief and fast at this size; tests run on an in-memory copy. The limit is concurrent writers, which is fine for one HR team. On a free host the file is not persistent, so the app seeds on first boot; real use would mount a disk or move to Postgres with the same SQL.

**Insights computed in TypeScript, not SQL.** SQLite has no median. Loading ~10,000 rows of `(country, title, department, gender, hire date, salary, band)` is one indexed query, and every metric stays a pure, tested function. At millions of rows I would push counts and averages into SQL `GROUP BY` and keep medians on pre-aggregated tables.

**Bad list parameters fall back to defaults; bad writes fail loudly.** A broken bookmark still shows a list. A wrong salary never gets "fixed" silently.

**Fixed exchange rates.** Only the org-wide payroll and cross-country median comparison use USD. A fixed, documented table keeps those stable and avoids an external dependency.

**Hand-rolled UI primitives on Tailwind** instead of a component library: a handful of components cover every screen; a library would add weight for no visible gain.

**No hard delete.** People leave; their pay history must not disappear. Deactivate keeps the record and removes them from insights.

## Performance

Measured locally on the seeded data (10,000 employees, 48,207 salary changes, 136 bands), median of 5 warm requests:

| Request | Time |
|---|---|
| Seed everything (one transaction) | ~1.6 s |
| `GET /api/employees` (first page) | 20 ms |
| `GET /api/employees?search=patel&country=IN&sort=compa&order=desc` | 15 ms |
| `GET /api/employees?band=below&page=5` | 21 ms |
| `GET /api/employees/1/salary` | 18 ms |
| `GET /api/insights?country=US` (all six insight blocks) | 79 ms |
| `GET /api/employees/export` (10,000-row CSV) | 78 ms |

What keeps it fast:
- Server-side paging, page size capped at 100.
- Indexes on `(country, job_title)` (also the band join), `status`, `full_name NOCASE`, `salary`, and `salary_changes (employee_id, effective_date)`.
- Prepared statements with named parameters; sort columns from a whitelist.
- Seed inserts inside one transaction.
- CSV export streams rows with an iterator instead of loading pages.
- Search waits 250 ms after typing stops.

Known limit: `LIKE '%term%'` cannot use an index, so search scans; still ~15 ms here. At a million rows I would add SQLite FTS5.
