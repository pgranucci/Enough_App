# Profile assumptions → emergency/slush completion cross-check

When the user edits **Profile → Assumptions** (custom conservative / balanced / aggressive returns and annual inflation), **assigned brokerage/retirement** completion uses those values — **not** the separate “Expected Annual Return in Retirement” field (that one is for Freedom retirement projections only).

**Run test:** `npx vitest run src/core/buckets/profile-assumptions-completion.test.ts`  
**Frozen today:** 2026-05-15

---

## Scenario — custom assumptions + brokerage → emergency

### Profile → Assumptions (user overrides)

| Field | User value | Preset default (for contrast) |
|--------|------------|-------------------------------|
| Conservative | **4%** | 5% |
| Balanced | **9%** | 7.5% |
| Aggressive | **11%** | 10% |
| Short-term / cash | **0%** (locked) | 0% |
| **Annual inflation** | **3.5%** | 2.5% |
| Expected return *in retirement* | 6% | 7.5% |

`investmentGrowthMode` is set to **`custom`** when any mix rate is edited.

### Assigned account & bucket

| Field | Value |
|--------|--------|
| Account | Brokerage, mix **balanced** |
| Balance | **$12,000** |
| Estimated annual savings | **$2,400** → **$200/mo** |
| Bucket | **Emergency** |
| Target | **$30,000** (today’s dollars) |

### Real return used in completion loop

Fisher equation on the account’s mix nominal and profile inflation:

```text
real = (1 + 0.09) / (1 + 0.035) − 1 ≈ 5.314%
```

**Not** 6% (retirement return field). **Not** 9% nominal.

### Month loop (unchanged)

```text
balance = 12,000
each month: balance += 200
every 12 months: balance *= (1 + 0.05314)
stop when balance >= 30,000
completion_date = 2026-05-15 + months
```

### Expected (Enough App)

| Metric | Value |
|--------|------:|
| `annualGrowthRate` (UI, nominal mix) | **9%** |
| `annualInflationRate` on bucket | **3.5%** |
| Real rate in search | **5.314%** |
| **Months** | **63** |
| **Estimated completion** | **2031-08-15** |

### Compare to presets (same dollars, default 7.5% / 2.5%)

Same $12k, $200/mo, $30k target with **preset** balanced → real **4.878%** → **~72 months** (~2032-05).  
Higher custom nominal **and** higher inflation → real **5.314%** → **63 months** (faster).

---

## Prompt for another AI

```text
Enough App: user overrides Profile → Assumptions, then assigns brokerage to emergency.

Today = 2026-05-15. Emergency target $30,000 (flat, no inflation on target).

Profile custom rates: conservative 4%, balanced 9%, aggressive 11%, inflation 3.5%.
(Account uses balanced mix.) Brokerage $12,000, saves $2,400/year ($200/month).

Completion uses REAL return on the account mix, not the "Expected Annual Return in Retirement" field.

real = (1.09 / 1.035) - 1 = 5.314% per year (applied at end of each 12-month block).
Each month: balance += 200 before yearly growth step.

Find months until balance >= 30,000; add to 2026-05-15.

Expected: 63 months, completion 2031-08-15.
UI shows nominal annualGrowthRate 9% and inflation 3.5% on the bucket.
```

---

## What does NOT affect this completion date

| Field | Affects completion? |
|--------|---------------------|
| Custom conservative / balanced / aggressive | **Yes** (via account mix) |
| Annual inflation | **Yes** (Fisher real return) |
| Expected annual return *in retirement* | **No** |
| Planning mode solo/partner | **No** (unless changing account savings via salary on 401k) |
| Retirement age / life expectancy | **No** |
