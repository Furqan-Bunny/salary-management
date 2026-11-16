# Seed data

`npm run seed` creates a fictional ACME: 10,000 employees across 8 countries and 17 job titles, about 48,000 salary changes and 136 pay bands, in under 2 seconds. A seeded random generator (mulberry32, seed 42) and a fixed reference date (2026-11-01) make every run identical, so tests and the demo always see the same company.

## How it is built

- **Countries and headcount:** US 30%, India 22%, UK 12%, Germany 10%, Canada 8%, Australia 7%, Singapore 6%, UAE 5%.
- **Bands:** midpoint = country base × role factor (e.g. Director 2.3×, Support 0.6×), minimum 80% and maximum 120% of the midpoint.
- **Hire dates:** up to 12 years back, skewed recent like a growing company.
- **Salary history:** starting pay is a random point in the band, adjusted down for people hired long ago (bands rise with the market). Then roughly one change a year: 85% merit (2 to 5%), 10% promotion (6 to 12%), 5% market adjustment (3 to 6%). The last change is the current salary.
- **Result:** about 97% of people within band, 2% below and 1% above, which is a plausible picture for a company with a maintained pay structure.

## Patterns planted on purpose

So the insight screens have something real to find, two patterns are added deliberately (see `PLANTED` in `src/server/seed/generate.ts`):

| Pattern | Where | How |
|---|---|---|
| Gender pay gap | Germany, Senior Software Engineer; India, Sales Representative | Women in these roles get an offer 7% lower at hire and half-size raises after. Shows as a 15 to 17% median gap. |
| Pay compression | US, Software Engineer; UK, Data Scientist | Recent hires start at 1.08 to 1.16 of midpoint while tenured staff get smaller raises. |

Everything else is random within the ranges above, so the screens will also show a few smaller flags caused by chance. That is realistic: the tool points HR at where to look, and HR decides whether a gap is justified.

All names and emails are fictional (`@acme.example`).
