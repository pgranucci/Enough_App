# Retirement Roth / pre-tax cross-check scenario

Same **income timeline** as [RETIREMENT_CROSSCHECK_SCENARIO.md](./RETIREMENT_CROSSCHECK_SCENARIO.md), plus **portfolio tax treatment** (Roth vs pre-tax vs mix). Copy this entire file to another AI or spreadsheet.

**Prerequisite:** Read the base scenario first for ages 55–90 income, SS timing, part-time, and net portfolio need plateaus.

**See also:** [ROTH_AWARE_WITHDRAWAL_CROSSCHECK.md](./ROTH_AWARE_WITHDRAWAL_CROSSCHECK.md) for all locked scenarios after Roth-aware wiring.

---

## Part 1 — Income (unchanged; Roth does not affect this)

| Field | Value |
|--------|--------|
| Retire at age | 55 |
| Life expectancy | 90 |
| Lifestyle (gross, flat) | $60,000/yr |
| Social Security | $24,000 gross/yr from age **62** |
| Part-time | $2,000/mo ($24k/yr), ages **65–70** |
| State / filing | Texas, single |
| Nominal return / inflation | 7.5% / 2.5% → **real ≈ 4.878%** (Fisher) |

**Net calibration (federal + state income tax only; no FICA / Medicare payroll tax):**

| Gross | Net |
|-------|-----|
| $60,000 lifestyle | $54,839 |
| $24,000 (SS or part-time) | $23,100 |

**Reference tax rate on $60,000 gross lifestyle:** **t = 8.6%** (effective income tax rate, not payroll).

**Year-by-year net portfolio need** (same three plateaus as base doc):

| Ages | Net portfolio need/yr |
|------|----------------------:|
| 55–61 | $54,839 |
| 62–64, 71–90 | $31,739 |
| 65–70 | $8,639 |

---

## Part 2 — Roth-aware gross-up with year-by-year tax (production schedule)

Each retirement year, the app solves for portfolio gross withdrawal **G** such that **household net income** (after federal + state tax on taxable income) equals the lifestyle net goal. Tax is **recomputed every year** as SS, partner work, and other streams change — not a single fixed rate from year one.

Let **s** = Roth share, **known_gross** = non-portfolio income that year (gross).

```text
taxable_gross = known_gross + G × (1 − s)
household_net(G) = known_gross + G − tax(taxable_gross)

Find G such that household_net(G) = lifestyle_net
```

**Fixed-rate approximation** (Roth gross-equivalent display only):

```text
G ≈ N × ( s + (1 − s) / (1 − t) )     where t = effective rate on $60k lifestyle alone
```

| s | Age-55 (no other income) G — approximate |
|---|------------------------------------------:|
| 0% (all pre-tax) | **$60,000** |
| 50% | **~$57,393** |
| 100% (all Roth) | **$54,839** |

**Required portfolio PV** = discount all years’ solved **G** at **r_real ≈ 0.04878** (varies with income timeline and Roth share).

---

## Part 3 — Roth “gross equivalent” balance (for readiness %)

Roth dollars are after-tax; to compare to the pre-tax-funded target:

```text
roth_gross_equivalent = roth_nominal / (1 − t)
gross_equiv = traditional_nominal + roth_nominal / (1 − t)
readiness = min(100, round( gross_equiv / required_portfolio × 100 ))
```

No FICA on any of the above — income tax only.

---

## Part 4 — Balance test cases (at age 55, today’s dollars)

Assume **current age = retirement age = 55**, **$0** monthly contributions, **no** growth between now and retirement.

### 4a. “Fully funded” equivalents (100% readiness)

| Case | Traditional | Roth | Required PV | Gross-equiv | Readiness |
|------|------------:|-----:|------------:|------------:|----------:|
| **A — 100% pre-tax** | $682,352 | $0 | $682,352 | $682,352 | **100%** |
| **B — 100% Roth** | $0 | $623,670 | $623,670 | $682,352 | **100%** |
| **C — 50/50 nominal** | $341,176 | $341,176 | $653,011 | $714,454 | **100%** |

**Formulas for B and C:**

```text
roth_nominal_for_100% = required_pv_all_roth
                      = 623,670  (PV of net-only withdrawals)

half_nominal_each ≈ 341,176  (50/50 case in test fixture)
```

### 4b. Under-funded examples

| Case | Traditional | Roth | Required PV | Gross-equiv | Readiness |
|------|------------:|-----:|------------:|------------:|----------:|
| **D — pre-tax** | $600,000 | $0 | $682,352 | $600,000 | **88%** |
| **E — Roth** | $0 | $550,000 | $623,670 | $601,751 | **96%** |

Same **nominal** Roth balance ($550k) yields **higher** readiness than $600k pre-tax because required PV is lower and gross-equiv is higher.

---

## Part 5 — Side-by-side at age 55

| Metric | 100% pre-tax (s=0) | 50/50 (s=0.5) | 100% Roth (s=1) |
|--------|-------------------:|--------------:|----------------:|
| Net need | $54,839 | $54,839 | $54,839 |
| Gross withdrawal G | $59,999 | $57,419 | $54,839 |
| Required PV | $682,352 | $653,011 | $623,670 |

---

## Prompt for another AI

```text
Use RETIREMENT_ROTH_CROSSCHECK_SCENARIO.md.

1. Confirm base income schedule → net need plateaus (Part 1).
2. Apply G = N × (s + (1−s)/(1−t)) with t = 8.6%.
3. Discount G at 4.878% real → required PV $682,352 / $653,011 / $623,670 for s = 0 / 0.5 / 1.
4. Verify readiness cases A–E (Part 4).
5. Confirm no FICA on portfolio withdrawals — income tax only.
6. Note: required PV now depends on Roth mix; readiness uses gross-equivalent balances.
```

---

## Reproduce in Enough App

1. Match base retirement inputs (retire 55, life 90, $60k gross, SS $24k @62, part-time $2k/mo 65–70, TX single, 7.5%/2.5%).
2. Set **current age = 55**, **retirement age = 55**, contributions **$0**.
3. Enter **Traditional balance** / **Roth balance** per cases A–E above.
4. Run: `npx vitest run src/core/retirement/retirement-roth-crosscheck.test.ts`
5. Read: `retirement-roth-crosscheck-output.txt`

---

## Related files

| File | Purpose |
|------|---------|
| `docs/ROTH_AWARE_WITHDRAWAL_CROSSCHECK.md` | All scenarios + CO couple sample years |
| `docs/RETIREMENT_CROSSCHECK_SCENARIO.md` | Base income-only cross-check |
| `src/core/retirement/retirement-roth-crosscheck.test.ts` | Automated reference output |
| `utils/retirement-income-tax.ts` | `grossAnnualWithdrawalForNetNeed` |
| `utils/retirement-planning.ts` | `rothToGrossEquivalent`, readiness |
