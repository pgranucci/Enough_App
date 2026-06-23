# Assigned-account completion date cross-check

When a user assigns **non-savings** accounts (brokerage, retirement) to **Emergency** or **Slush**, completion uses **investment growth** (real return for invested types), not bank-style 0% cash growth.

**Run tests:** `npx vitest run src/core/buckets/assigned-accounts-crosscheck.test.ts`  
**Source:** `src/core/buckets/assigned-accounts.ts`, `src/core/shared/projection.ts`

**Frozen “today” in tests:** **2026-05-15**

**Profile assumptions:** `investmentGrowthMode = balanced`, inflation **2.5%**

| Mix | Nominal (display) | Real (completion math) |
|-----|------------------:|-----------------------:|
| Balanced | 7.5% | **4.878%** = (1.075/1.025)−1 |
| Conservative | 5.0% | **2.439%** = (1.05/1.025)−1 |

---

## Shared algorithm

### 1. Roll up assigned accounts

```text
current_total     = sum(account balances)
monthly_total     = sum(annual_contribution_per_account / 12)
```

Brokerage contributions = `estimatedAnnualSavings`.  
Retirement employer plans use salary × deferral % (not used in scenarios below).

### 2. Growth rate for completion search

For **emergency** / **slush** buckets:

| Account type | Mix | Rate used in month-by-month search |
|--------------|-----|-------------------------------------|
| **Savings** | cash | **0%** nominal (short-term preset) |
| **Brokerage / retirement** | conservative / balanced / aggressive | **Real** return (Fisher on mix nominal − inflation) |

UI **annualGrowthRate** on the bucket shows **nominal** mix return (7.5% or 5%), not the real rate used internally for completion.

### 3. Future value month loop

Target is **today’s dollars** (no inflation on emergency/slush target).

```text
balance = current_total
for month = 1, 2, … up to 150 years:
  balance += monthly_total
  if month mod 12 == 0:
    balance *= (1 + real_growth_decimal)
  if balance >= target:
    completion_months = month
    completion_date = today + completion_months calendar months
    stop
```

If `monthly_total = 0` and `real_growth ≤ 0` → **no date** (UI shows `—`).

### 4. Contrast: savings assigned to same bucket

A **savings** account with cash mix uses **0%** growth in this loop. With **$0** annual savings and **0%** growth, completion is **never** reached (`—`).

---

## Scenario 1 — Emergency ← brokerage (balanced), growth only

### Setup

| Field | Value |
|--------|--------|
| Bucket | Emergency |
| Target | **$30,000** |
| Account | Brokerage, **balanced** mix |
| Balance | **$10,000** |
| Estimated annual savings | **$0** |

### Expected (Enough App)

| Metric | Value |
|--------|------:|
| Current | $10,000 |
| Monthly contribution | $0 |
| Real growth (search) | 4.878% |
| Display growth (nominal) | 7.5% |
| **Months to target** | **288** |
| **Estimated completion** | **2050-05-15** |

### Prompt for another AI

```text
Enough App: emergency bucket completion with assigned brokerage (not savings).

Today = 2026-05-15. Target $30,000 (today's dollars, no inflation on target).
Balance $10,000. Monthly contribution $0.
Real return 4.878% (Fisher: 7.5% nominal, 2.5% inflation).

Each month: balance += 0; every 12 months balance *= 1.04878.
Find first month where balance >= 30,000; add that many months to 2026-05-15.

Expected: 288 months, completion ~2050-05-15.
```

---

## Scenario 2 — Slush ← brokerage (balanced), with savings

### Setup

| Field | Value |
|--------|--------|
| Bucket | Slush |
| Target | **$18,000** |
| Account | Brokerage, **balanced** |
| Balance | **$8,000** |
| Estimated annual savings | **$3,600** → **$300/mo** |

### Expected

| Metric | Value |
|--------|------:|
| Current | $8,000 |
| Monthly contribution | $300 |
| Real growth | 4.878% |
| **Months to target** | **29** |
| **Estimated completion** | **2028-10-15** |

### Prompt for another AI

```text
Enough App: slush bucket, brokerage assigned, balanced mix.

Today = 2026-05-15. Target $18,000 flat.
Start $8,000. Add $300 at start of each month.
Annual real growth 4.878% applied at end of each 12-month block.

Month loop until balance >= 18,000.

Expected: 29 months, completion 2028-10-15.
```

---

## Scenario 3 — Emergency ← brokerage (conservative), growth only

### Setup

| Field | Value |
|--------|--------|
| Bucket | Emergency |
| Target | **$27,000** |
| Account | Brokerage, **conservative** mix |
| Balance | **$12,000** |
| Annual savings | **$0** |

### Expected

| Metric | Value |
|--------|------:|
| Current | $12,000 |
| Monthly contribution | $0 |
| Real growth | **2.439%** (5% nominal, 2.5% inflation) |
| Display growth (nominal) | 5% |
| **Months to target** | **408** |
| **Estimated completion** | **2060-05-15** |

Shows a **slower** date than scenario 1 despite a higher starting balance, because conservative real return is lower.

### Prompt for another AI

```text
Enough App: emergency, brokerage conservative mix, growth only.

Today = 2026-05-15. Target $27,000. Balance $12,000. $0/month.
Real return 2.439% = (1.05/1.025) - 1. Apply yearly at months 12, 24, ...

Expected: 408 months, completion 2060-05-15.
Compare to balanced 7.5% nom case: $10k → $30k in 288 months (2050-05).
```

---

## Scenario 4 — Partner household, emergency ← two brokerages (mixed)

### Planning mode

`planningMode: partner` — household income is split for **401(k)-style** deferrals only.  
These two accounts are **brokerage**, so contributions come from each line’s **`estimatedAnnualSavings`** (not salary %). Partner mode does **not** change the completion formula beyond whose name is on each account.

### Setup

| Field | Self brokerage | Partner brokerage |
|--------|----------------|-------------------|
| Owner | `self` | `partner` |
| Mix | **Aggressive** (10% nom) | **Conservative** (5% nom) |
| Balance | **$15,000** | **$6,000** |
| Est. annual savings | **$4,800** | **$1,200** |
| Monthly savings | $400 | $100 |

| Field | Value |
|--------|--------|
| Bucket | Emergency |
| Target | **$37,500** (e.g. partner household floor × 6) |
| **Combined balance** | **$21,000** |
| **Combined monthly contrib** | **$500** |

### Weighted growth (balance-weighted)

```text
real_self       = (1.10 / 1.025) − 1 ≈ 7.317%
real_partner    = (1.05 / 1.025) − 1 ≈ 2.439%

weighted_real   = (15,000 × 7.317% + 6,000 × 2.439%) / 21,000 ≈ 5.922%
weighted_nominal (UI display) = (15,000 × 10% + 6,000 × 5%) / 21,000 ≈ 8.57%
```

If balances were $0, weights would fall back to contributions; here balances drive the blend.

### Expected (Enough App)

| Metric | Value |
|--------|------:|
| Current | $21,000 |
| Monthly contribution | $500 |
| Display `annualGrowthRate` | ~**8.57%** nominal (weighted) |
| Real rate in month loop | ~**5.922%** |
| **Months to target** | **26** |
| **Estimated completion** | **2028-07-15** |

### Prompt for another AI

```text
Enough App: partner planningMode (household); emergency bucket.
Two brokerage accounts assigned — NOT savings.

Today = 2026-05-15. Emergency target $37,500 (today's dollars).

Account A (self): $15,000, aggressive 10% nominal, saves $4,800/yr ($400/mo).
Account B (partner): $6,000, conservative 5% nominal, saves $1,200/yr ($100/mo).

Real returns (2.5% inflation): aggressive 7.317%, conservative 2.439%.
Weighted real for FV loop = balance-weighted average ≈ 5.922%.
Total start $21,000, total $500/mo at month start, apply weighted real at months 12, 24, …

Expected: 26 months, completion 2028-07-15.
Show weighted real calculation step-by-step.
```

---

## Quick reference

| Scenario | Bucket | Account | Balance | $/mo | Target | Months | Completion |
|----------|--------|---------|--------:|-----:|-------:|-------:|------------|
| 1 | Emergency | Brokerage balanced | $10,000 | $0 | $30,000 | 288 | 2050-05 |
| 2 | Slush | Brokerage balanced | $8,000 | $300 | $18,000 | 29 | 2028-10 |
| 3 | Emergency | Brokerage conservative | $12,000 | $0 | $27,000 | 408 | 2060-05 |
| 4 | Emergency | 2 brokerages (agg + cons) | $21,000 | $500 | $37,500 | 26 | 2028-07 |

---

## Related

- Target **amounts** from expenses: [EMERGENCY_TARGET_CROSSCHECK_SCENARIOS.md](./EMERGENCY_TARGET_CROSSCHECK_SCENARIOS.md)
- Original repro: `src/core/buckets/completion-scenarios.test.ts` (scenario 1 duplicate)
