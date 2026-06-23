# Retirement progress / readiness cross-check

How **readiness %** is derived: **projected portfolio at retirement ÷ required portfolio**, capped at **100%**.

**Run:** `npx vitest run src/core/retirement/retirement-progress-crosscheck.test.ts`

---

## Where progress appears

| UI | Formula | Projection method |
|----|---------|-------------------|
| **Freedom tab** — “Projected retirement readiness” | `calculateRetirementPlan` → `projectedReadinessPercent` | **Aggregate:** pre-tax + Roth balances, **one** real return from `expectedAnnualReturn` (7.5%) + inflation, split contributions by balance share |
| **Progress tab** — Retirement bucket bar | `buildRetirementBucket` → `readinessProgress` | **Per assigned account:** each account’s **mix** (balanced, aggressive, …), employee vs employer contributions, then gross-equivalent at retirement |

Both use the **same required portfolio** (`requiredPortfolioTarget` from year-by-year income PV).

```text
readiness % = min(100, round( projected_gross_equivalent / required_portfolio × 100 ))
```

**“Today” effective portfolio** (Freedom card header): `traditional + roth` nominal (Roth **not** grossed up for display total).

---

## Shared retirement goal (both scenarios)

| Field | Value |
|--------|--------|
| Solo, Texas, single |
| Age **40** → retire **65** (**25 years**, 300 months) |
| Lifestyle gross | **$60,000**/yr, no SS / pension / other income |
| Life expectancy | 90 |
| Assumptions | 7.5% nominal, 2.5% inflation → **real 4.878%** |
| **Required portfolio** | **$995,291** |

---

## Scenario 1 — Fixed balance, no savings

### Inputs

| Field | Value |
|--------|------:|
| Pre-tax balance | **$250,000** |
| Roth balance | **$0** |
| Monthly contributions | **$0** |
| Assigned accounts | none |

### Projected balance at 65

Single pot, real growth **4.878%**, FV month loop (same as `simulateRetirement`):

```text
projected = FV($250,000, $0/mo, 4.878% real, 300 months) ≈ $822,347
```

### Expected readiness

| Metric | Value |
|--------|------:|
| Projected (gross-equiv) | **$822,347** |
| Required | **$995,291** |
| **Readiness** | **83%** (`822,347 / 995,291`) |
| Freedom label | “Close” (≥75%, <100%) |

Freedom and Retirement bucket match (~82.6% progress bar vs 83% rounded).

### Estimated completion date (Retirement bucket)

The bucket **completion date** is when the balance reaches **$995,291** with **$0/month** savings — not the same formula as readiness at age 65.

| Field | Value |
|--------|--------|
| Growth in completion search | **7.5% nominal** (`expectedAnnualReturn`, not Fisher real) |
| Months to target | **240** |
| **Estimated completion** (from 2026-05-15) | **2046-05-15** |
| User age at completion | **60** (40 + 20 years) |

**Planned retirement age 65** (~2051) is **after** this completion date on the nominal path, but **readiness at 65 is only 83%** because Freedom/bucket **projection to retirement** uses **real 4.878%** → only **$822,347** by then.

Cross-check both numbers: completion (nominal 7.5%) vs readiness at 65 (real 4.878%).

### Prompt — Scenario 1 completion date

```text
Enough App Scenario 1 completion date (Retirement bucket).

Today = 2026-05-15. Current balance $250,000. Target $995,291. $0/month.
Completion search uses NOMINAL 7.5% annual growth (not inflation-adjusted real).

Month loop: each month += 0; every 12 months balance *= 1.075.
Find first month balance >= 995,291; add months to 2026-05-15.

Expected: 240 months, completion date 2046-05-15.

(Separately: readiness at age 65 uses REAL 4.878% → $822,347 → 83% — different rate.)
```

### Prompt — Scenario 1

```text
Enough App retirement readiness — simple, no ongoing savings.

Age 40→65 (300 months). Required portfolio $995,291 (from $60k/yr lifestyle PV).
Today: $250,000 pre-tax, $0 Roth, $0/month contributions.
Project with real return 4.878% (7.5% nom, 2.5% inflation). Roth gross-equiv = same as nominal when Roth = 0.

readiness = min(100, round(projected / 995,291 × 100)).

Expected projected ≈ $822,347, readiness 83%.
```

---

## Scenario 2 — 401(k) + Roth IRA (complex)

### Profile

Salary **$95,000** (for employer-plan % deferrals).

### Assigned accounts

**401(k)** — employer plan, **balanced** mix (real **4.878%**)

| | |
|--|--|
| Pre-tax balance | $120,000 |
| Roth balance | $30,000 |
| Employee deferrals | **8%** pre-tax + **2%** Roth |
| Employer | **4%** match + **2%** profit sharing |

```text
Employee annual = 95,000 × (8% + 2%) = $9,500
Employer annual = 95,000 × (4% + 2%) = $5,700
401(k) total annual = $15,200
```

Employee deferrals split **80%** pre-tax / **20%** Roth (8% vs 2% of 10%).

**Roth IRA** — **aggressive** mix (real **7.317%** = 10% nom / 2.5% infl)

| | |
|--|--|
| Balance | $45,000 (all Roth) |
| Annual contribution | **$7,000** |

### Monthly totals

| | $/month |
|--|--------:|
| Employee (401k + IRA) | **$1,375** |
| Employer (401k only) | **$475** |
| **Total** | **$1,850** |

### Per-account FV (300 months)

For each account, use **its mix real return**. Retirement accounts split monthly contributions between pre-tax and Roth sub-ledgers by deferral share; employer $ goes to pre-tax share of 401(k).

Then:

```text
projected_gross_equivalent = FV_pre_tax_total + gross_equiv(FV_roth_total)
gross_equiv(roth) = roth_FV / (1 − t)     // t ≈ effective tax on $60k lifestyle
```

**Balance-weighted display return** ≈ **5.44%** real (nominal weighted ~5.67% on balances).

### Expected readiness

| Path | Projected gross-equiv | Readiness |
|------|----------------------:|----------:|
| **Retirement bucket** (per-account) | **$2,096,802** | **100%** |
| **Freedom** (aggregate 7.5% on synced totals) | **$1,796,913** | **100%** (capped) |

Both exceed required **$995,291** → **100%** displayed. Bucket projection is **higher** because aggressive IRA grows faster than the single 7.5% rate used on Freedom’s aggregate path.

### Prompt — Scenario 2

```text
Enough App retirement readiness — 401(k) + Roth IRA, age 40→65.

Required portfolio: $995,291. Salary $95,000.

401(k): $120k pre-tax + $30k Roth, balanced (real 4.878%).
  Employee 8% pre + 2% Roth; employer 4% match + 2% profit share → $15,200/yr.
  Split employee $9,500 80/20 pre/Roth; employer $5,700 all to pre-tax side.
  FV each sub-ledger separately with 4.878% real, 300 months.

Roth IRA: $45k aggressive (real 7.317%), $7,000/yr employee → FV with 7.317% real.

Sum pre-tax FVs + Roth FVs; gross-up total Roth FV by (1/(1-t)) for t ≈ tax on $60k gross.

Expected bucket projected gross-equiv ≈ $2,096,802 → readiness 100%.
Aggregate Freedom path (single 7.5% on all) ≈ $1,796,913 → also 100% capped.
```

---

## Quick reference

| | Scenario 1 | Scenario 2 |
|--|------------|------------|
| Required | $995,291 | $995,291 |
| Projected (bucket path) | $822,347 | $2,096,802 |
| Readiness | **83%** | **100%** |
| Contributions | $0 | $22,200/yr |

---

## Files

- Test: `src/core/retirement/retirement-progress-crosscheck.test.ts`
- Freedom: `app/(tabs)/freedom.tsx`
- Bucket: `constants/buckets.ts` → `buildRetirementBucket`
- Account FV: `utils/retirement-portfolio-projection.ts`
