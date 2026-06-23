# Roth vs pre-tax savings — retirement progress cross-check

Same inputs except **where dollars are saved**. Compares **Freedom readiness %** (`projectedReadinessPercent`).

**Run:** `npx vitest run src/core/retirement/retirement-roth-vs-pretax-progress.test.ts`

---

## Shared inputs (both scenarios)

| Field | Value |
|--------|--------|
| Solo, Texas, single |
| Age **40** → retire **65** (**25 years**, 300 months) |
| Lifestyle gross | **$60,000**/yr |
| Social Security | **Excluded** |
| Pension / other income | $0 |
| **Starting balance** | **$50,000** (all in one tax type) |
| **Monthly savings** | **$500** ($6,000/yr) |
| Growth | **7.5%** nominal → **4.878%** real (2.5% inflation) |
| **Required portfolio** | **$995,291** (same both scenarios) |

**Important:** Put the full $50k in **either** `rothBalance` **or** `traditionalBalance` (not split). That routes 100% of new savings to the same bucket. If both balances are $0, the app defaults to a 50/50 contribution split.

---

## How readiness is calculated

```text
readiness % = min(100, round( future_gross_equivalent / required_portfolio × 100 ))
```

Project each bucket to age 65 with **real 4.878%** (same nominal FV either way):

```text
FV_nominal = FV($50,000, $500/mo, real 4.878%, 300 months) ≈ $459,800
```

Then convert to **spending power** vs pre-tax-funded goal:

| Scenario | At retirement | Gross-equivalent |
|----------|--------------:|-----------------:|
| **A — Roth only** | $459,800 nominal Roth | **$459,800 ÷ (1 − t)** |
| **B — Pre-tax only** | $459,800 nominal pre-tax | **$459,800** (no gross-up) |

**t** = effective income tax on **$60,000** gross lifestyle ≈ **8.6%**.

```text
gross_equiv_roth    = 459,800 / 0.914 ≈ 503,063
gross_equiv_pretax  = 459,800
```

---

## Expected results (Enough App)

| | Scenario A (Roth) | Scenario B (Pre-tax) |
|--|------------------:|---------------------:|
| Nominal FV at 65 | **$459,800** | **$459,800** |
| Gross-equivalent | **$503,063** | **$459,800** |
| **Readiness %** | **51%** | **46%** |

Same dollars saved, same investment return — **Roth shows higher readiness** because Roth dollars already represent **after-tax** spending power; the app grosses them up to compare fairly to the pre-tax-style **required portfolio** target.

Retirement bucket `readinessProgress` matches the same ratio (51% vs 46%).

---

## Prompt — Scenario A (Roth savings)

```text
Enough App retirement progress — Roth-only savings.

Age 40→65, $50k Roth balance today, $0 pre-tax, $500/mo to Roth only.
Lifestyle $60k gross, SS excluded, TX single. Required portfolio $995,291.

Project: FV with real 4.878% (7.5% nom, 2.5% infl) → nominal ≈ $459,800.
Gross-equivalent = nominal / (1 - 0.086) ≈ $503,063.
Readiness = min(100, round(503,063 / 995,291 × 100)) → 51%.

Show FV loop and gross-up step.
```

---

## Prompt — Scenario B (Pre-tax savings)

```text
Enough App retirement progress — pre-tax-only savings.

Same as Scenario A except $50k pre-tax, $0 Roth, $500/mo to pre-tax only.

Same FV nominal ≈ $459,800. No gross-up: gross-equivalent = $459,800.
Readiness = round(459,800 / 995,291 × 100) → 46%.

Compare to Roth scenario (51%) — same nominal savings, higher readiness when Roth due to gross-equivalent.
```

---

## Prompt — both scenarios together

```text
Compare two retirement progress scenarios with IDENTICAL inputs except tax location of savings:

Shared: 40→65, $50k start, $500/mo, $60k lifestyle, SS excluded, required $995,291, real 4.878%.

A: All Roth → FV $459,800 → gross-equiv $503,063 → 51% ready.
B: All pre-tax → FV $459,800 → gross-equiv $459,800 → 46% ready.

Formula: readiness = projected_gross_equivalent / required, cap 100%.
t = 8.6% on $60k reference for Roth gross-up only.
```

---

## What does NOT differ

- **Required portfolio** ($995,291) — income goal only, not affected by Roth vs pre-tax savings today
- **Nominal FV** at retirement — same growth path on the same dollars
- **Current “effective portfolio” display** — Roth balance is grossed up **today** too (same t)

## Caveat

If you use **assigned accounts** (401k with mix) instead of aggregate `traditionalBalance` / `rothBalance`, the Retirement bucket may use **per-account** mix returns; Freedom still uses the aggregate path above when no account-level override is wired through context.
