# Research: how companies actually manage salaries

Before scoping, I looked at what compensation tools that HR teams pay for (Pave, Carta Total Compensation, HiBob, Workday, Rippling) do, what compensation professionals measure, and what regulation is coming. The goal was to find the questions an HR Manager really asks, not just "show me a table of salaries".

## 1. The core idea in every compensation tool: salary bands

Every serious tool organises pay around **bands**: a minimum, midpoint and maximum for a role in a location. Pay decisions are then judged against the band, not in isolation.

- Pave highlights "compa ratio and range penetration" and lets HR "identify employees who are out of band to resolve inequities". ([Pave Foundations](https://pave.com/foundations))
- Carta defines compa-ratio as an employee's pay compared to the target rate "for a given job area, level, and location". ([Carta Total Comp guide](https://community.carta.com/education/customer-journey-guides/carta-total-compensation-getting-started))
- Buyer guides list the same core: maintaining compensation records, pay bands, compa-ratio analysis and pay equity. ([People Managing People](https://peoplemanagingpeople.com/tools/best-compensation-management-software), [HiBob](https://www.hibob.com/blog/compensation-management-tools/))

**Two standard metrics**, both used in this app:

| Metric | Formula | Reads as |
|---|---|---|
| Compa-ratio | salary / band midpoint | 1.00 = paid exactly at target; 0.85 = 15% under |
| Range penetration | (salary - min) / (max - min) | 0% = at the bottom of the band, 100% = at the top; below 0 or above 100 = out of band |

Sources: [AIHR compensation metrics](https://www.aihr.com/blog/compensation-metrics/), [HiBob on range penetration](https://www.hibob.com/blog/salary-range-penetration-metric/), [Deel on compa-ratio](https://www.deel.com/blog/compa-ratio-calculation-and-use-guide/).

**What this means for ACME:** "How do we pay people?" is really three questions: what do we pay (min/median/max), is it consistent with our own structure (compa-ratio, out of band), and is it fair (equity, compression).

## 2. Pay equity is becoming a legal requirement

The **EU Pay Transparency Directive** requires employers with 100+ workers to report gender pay gaps, with the largest employers reporting from June 2027 on 2026 data. A gap of **5% or more** within a category of workers that cannot be justified triggers a six-month window to fix it, after which a joint pay assessment with employee representatives is required. ([Workday](https://www.workday.com/en-gb/topics/hr/eu-pay-transparency-directive.html), [CMS](https://cms.law/en/int/legal-updates/beyond-disclosure-how-the-eu-pay-transparency-directive-will-reshape-employer-obligations), [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/01/eu-pay-transparency-directive-2026-employer-compliance))

ACME has 10,000 people, including employees in Germany, so this applies. The UK has had mandatory gender pay gap reporting for employers with 250+ staff since 2017.

**What this means for ACME:** the HR Manager needs to see the median gap per job title per country, with the 5% line marked, before a regulator or an employee does.

## 3. Pay compression

Compression is when new hires are paid as much as or more than people who have been in the same role for years. A Syndio analysis found that in 83% of high-paying job groups, tenured employees do not earn more than new hires, and 30% of the time they earn less. The recommended check is to compare compa-ratios of tenured staff and recent hires **by role**. ([Syndio](https://synd.io/press-release/tenure-and-pay/), [Rippling](https://rippling.com/blog/pay-compression))

**What this means for ACME:** a simple per-role comparison of recent hires vs. people with 3+ years, flagged when new hires are paid at a higher compa-ratio.

## 4. Records need history, not overwrites

In Excel, changing a salary destroys the old value. HR systems keep every change with an effective date and a reason (hire, merit, promotion, market adjustment, correction), because questions like "when did she last get a raise?" and audits depend on it. Carta and other tools also keep band history for audits. ([HiBob](https://www.hibob.com/blog/compensation-management-tools/))

**What this means for ACME:** a salary change is an event, not an edit. Profile fields can be edited; salary changes are appended.

## 5. What other engineers built for this brief

The same brief has public solutions. The strongest ones share: requirements first, a clear service layer, median computed correctly, integers for money, currency derived from country, server-side paging, deterministic seed, test-first commit history, CI and a real deployment. Most stop at descriptive statistics (min/avg/max per country and title).

**Where this solution goes further:** it answers whether pay is *consistent and fair* (bands, compa-ratio, equity, compression) and treats salary changes as an auditable history, because that is what the tools HR actually buys do.

## What I deliberately did not copy

- **Merit cycle planning and approval workflows** (Pave, Workday): needs multiple roles and budgets, out of scope for a single HR Manager persona.
- **Market benchmarking data** (Pave, Carta): needs a paid external data source. Bands here are ACME's own structure, editable by HR.
- **Bonuses and equity**: the brief is about salaries.
