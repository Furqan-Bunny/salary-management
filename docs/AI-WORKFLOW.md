# How AI was used

I built this with an agentic coding assistant (Claude Code) in my terminal. I set the direction, the order of work and the bar for done; the assistant did the research legwork, wrote most of the code and ran the checks after every step. Every step ended with green tests, a type check and lint before it became a commit.

## The most important decision: throw the first version away

The first version was a clean but ordinary CRUD app with min/max/average per country and job title. It met the brief, but when I looked at it from the HR Manager's side it did not answer the real question, "are we paying people consistently and fairly?". So I asked the assistant to research how companies actually do this before writing anything else:

- what compensation tools HR teams buy (Pave, Carta, HiBob, Workday) have in common,
- what compensation professionals measure,
- what regulation is coming,
- and how other engineers had approached this same brief.

The findings are in [RESEARCH.md](RESEARCH.md). They changed the product: pay bands with compa-ratio and range penetration, salary changes as an auditable history, a gender pay gap view with the EU 5% threshold, and a compression check. I started the repository again from the requirements so the history tells that story cleanly.

## Working rules I gave the assistant

1. Requirements and research first; no code until both were committed.
2. Test first for every layer: commit the failing tests (`test: ... (red)`), then the code that makes them pass (`feat: ...`).
3. Build from the inside out: domain → repositories → services → API → UI.
4. Business rules only in `src/server`; route handlers stay one line; React components never compute business logic.
5. Integers for money, currency derived from country, no hard deletes.
6. No new dependency without a reason. Runtime dependencies added: `better-sqlite3`, `zod`, `tsx`.
7. Before each commit: `npm test`, `tsc --noEmit`, `eslint`.

## Prompts, in order (lightly trimmed)

1. **Research.** "Research how real companies manage salaries and compensation: the common features of compensation tools, the standard metrics, pay equity regulation, and how others solved this brief. Cite sources. Then tell me what an HR Manager at a 10,000-person multi-country company actually needs."
2. **Requirements.** "Turn the research into a one-page v1 scope with success measures, rules, and a table of what we leave out and why."
3. **Domain tests, then code.** "Write failing tests for compa-ratio, range penetration, band position, median gender pay gap, tenure, % change, and the input schemas (integer salary, email, no future hire date, min < mid < max). Then implement them as pure functions."
4. **Repositories.** "Three tables: employees with a version column, append-only salary_changes, salary_bands unique per country and title. Tests first: optimistic locking, history order, filters including band position, LIKE escaping, sort by compa-ratio, DB-level constraints."
5. **Services.** "Salary change rules: not before hire, not before the last change, not unchanged, not while inactive; history and current salary in one transaction. Stale edits become a conflict. Insights: overview, by country with USD median, by title with band, band health, pay equity with group-size suppression, compression. CSV export safe against formula injection."
6. **Seed.** "Deterministic 10,000 employees with consistent salary history and bands. Plant a gender gap in two roles and compression in two roles, and document exactly what was planted."
7. **API.** "Thin handlers; one helper maps validation to 400, not found to 404, conflicts to 409. Integration tests against real handlers with an in-memory database."
8. **UI.** "Employees list with filters in the URL so Insights can link to filtered lists; employee page with band bar, metrics and history; salary change form showing % change and an out-of-band warning; insights and pay band editor."
9. **Review pass.** Looking at the running app, I asked for: "Last increase" to ignore downward corrections; the out-of-band stat to link to the breakdown instead of only "above"; and the seed to be retuned, because the first version put too many long-tenured people far above band (compa-ratio up to 1.5) and nobody below it.
10. **Tightening thresholds.** With real seeded data, many small random gaps were being flagged. I raised the minimum group to 10 and added a 0.03 margin to compression, tests first.

## What I checked myself

- Read every diff before it was committed, with extra attention on SQL (injection paths, indexes against the actual queries) and on the definitions of each metric against the sources.
- Exercised the API with curl: status codes, conflict handling, history, CSV, timings.
- Clicked through every screen against the full 10,000-employee seed, including recording a salary change and following Insights links to filtered lists.
