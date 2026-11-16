# Requirements

## Goal

ACME's HR team keeps salary data for 10,000 employees across several countries in Excel. The HR Manager needs one web tool to keep that data correct and to answer **"how do we pay people?"**: what we pay, whether it matches our own pay structure, and whether it is fair.

See [RESEARCH.md](RESEARCH.md) for how this scope was derived from what real compensation tools do.

## Persona

**HR Manager.** Comfortable with spreadsheets, not technical. Cares about correctness and being able to defend a number. Single trusted user (no login in v1).

## Success measures

- Find any employee and change their salary in under 30 seconds.
- Every salary change is traceable: who it was for, how much, when it takes effect, and why.
- Answer "are we paying this role fairly in this country?" on one screen.
- List and insight requests respond in under 300 ms on 10,000 employees.

## Scope (v1)

### A. Employee records
1. Paginated list with search (name, email, employee code), filters (country, department, job title, status, band position) and sorting (name, salary, compa-ratio, hire date).
2. Each row shows salary in local currency and the **compa-ratio** with a colour cue when out of band.
3. Employee page: profile, current salary on a band bar (min, mid, max), compa-ratio, range penetration, tenure, and full **salary history**.
4. Add an employee with a starting salary. That creates the first history entry with reason "hire".
5. Edit profile fields. If someone else changed the record in the meantime, the save is rejected instead of silently overwriting (optimistic locking).
6. **Change salary** as an event: new amount, effective date, reason (merit, promotion, market adjustment, correction), optional note. The form shows the % change and warns if the new salary lands outside the band.
7. Deactivate and reactivate (people leave; their pay history must not vanish). No hard delete.
8. Export the filtered list to CSV (HR will always want to take numbers into a spreadsheet).

### B. Pay structure (bands)
9. A band (min, mid, max) per job title per country, in local currency. HR can view and edit them; min < mid < max is enforced.

### C. Insights
10. **Overview:** active headcount, countries, annual payroll in USD, share of people out of band.
11. **By country:** headcount, min, median, average, max in local currency, plus median in USD for cross-country comparison.
12. **By job title within a country:** headcount, median, band min/mid/max and average compa-ratio.
13. **Band health:** below / within / above band per country, with a link to the list of those employees.
14. **Pay equity:** median pay gap between women and men per job title in a country, flagged at **5%** (EU Pay Transparency Directive threshold). Groups with fewer than 5 people on either side are hidden, both for statistical noise and privacy.
15. **Pay compression:** per job title in a country, median compa-ratio of recent hires (under 1 year) vs. tenured staff (3+ years); flagged when recent hires are paid at a higher compa-ratio.
16. **By department:** headcount and payroll.

### D. Data
17. Deterministic seed: 10,000 employees across 8 countries with salary history and bands, in a few seconds, safe to re-run.

## Deliberately out of scope

| Out | Why |
|---|---|
| Login and roles | One trusted persona in the brief. First thing to add before real use, together with a "changed by" field on salary history. |
| Merit cycles, budgets, approvals | Needs managers and finance as users. Different product. |
| Market benchmark data | Requires a paid external data source. Bands are ACME's own structure. |
| Live exchange rates | Per-country numbers never need conversion. USD figures use a fixed, documented rate table, good enough for comparison and planning. |
| Excel import | Valuable on day one of real use, but parsing messy spreadsheets is its own project. The seed proves bulk loading. |
| Bonuses, equity, benefits | The brief asks about salaries. |
| Future-dated salary changes taking effect automatically | v1 stores the effective date; the current salary is the latest change. A scheduler can come later. |

## Rules

- Money is stored as whole units of local currency (integers). No floating point money.
- Currency is derived from country; it is never typed or stored.
- A salary change cannot be dated before the employee's hire date or before their previous change.
- Hire date cannot be in the future.
- Email is unique.
