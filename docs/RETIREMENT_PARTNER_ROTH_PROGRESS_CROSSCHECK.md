# Partner household — Roth vs pre-tax progress (SS excluded)

Two spouses, **same total savings**, different tax location for **Alex’s** account. Compare **retirement progress / readiness %**.

**Run:** `npx vitest run src/core/retirement/retirement-partner-roth-progress.test.ts`

---

## Shared household inputs

| Field | Value |
|--------|--------|
| Planning mode | **Partner** (Jordan 40, Alex 42) |
| Household gross income | **$170,000** ($100k + $70k) |
| Income replacement | **75%** → lifestyle gross **$127,500**/yr |
| Retire | Both **65** |
| Life expectancy | **90** each |
| Tax location | **Texas**, **married filing jointly** |
| Social Security | **Excluded** (both spouses) |
| Pension / other income | $0 |
| Growth | **7.5%** nominal / **2.5%** inflation → **4.878%** real (balanced mix) |

**Required portfolio (Roth-aware PV):**

| Scenario | Required PV |
|----------|------------:|
| Mixed (33% Roth at retirement) | **$1,888,605** |
| All pre-tax | **$1,945,678** |

Same nominal FV at 65 → **$1,231,497** in both cases.

---

## Accounts (same in both scenarios except Alex’s IRA type)

### Jordan — 401(k) (pre-tax only) — **unchanged**

| Field | Value |
|--------|--------|
| Owner | Self (Jordan) |
| Pre-tax balance | **$80,000** |
| Roth balance | **$0** |
| Mix | Balanced |
| Employee deferral | **8%** pre-tax on **$100,000** salary → **$8,000/yr** |
| Employer match | **3%** → **$3,000/yr** |

### Alex — IRA — **only difference between scenarios**

| | Scenario 1 | Scenario 2 |
|--|------------|------------|
| Account | **Roth IRA** | **Traditional IRA** |
| Balance | **$40,000** Roth | **$40,000** pre-tax |
| Annual contribution | **$6,000** | **$6,000** |
| Mix | Balanced | Balanced |

### Totals (both scenarios)

| | Scenario 1 | Scenario 2 |
|--|------------|------------|
| Pre-tax balance today | $80,000 | **$120,000** |
| Roth balance today | **$40,000** | $0 |
| **Total nominal today** | **$120,000** | **$120,000** |
| **Total annual savings** | **$17,000** ($11k + $6k) | **$17,000** |
| **Monthly savings** | **~$1,417** | **~$1,417** |

---

## How progress is calculated

### Step 1 — Project each assigned account to age 65

- **300 months**, real return **4.878%** per account (balanced)
- 401(k): employee $ to pre-tax/Roth split; employer $ to pre-tax
- IRA: employee $ to pre-tax or Roth ledger

**Result:** **Same total nominal FV** in both scenarios → **$1,231,497**

### Step 2 — Gross-equivalent portfolio

```text
gross_equiv = FV_pre_tax_total + FV_roth_total / (1 − t)
```

**t** ≈ **8.8%** effective tax on **$127,500** gross lifestyle (MFJ, TX).

| Scenario | Roth FV portion (grossed up) | Pre-tax FV portion | **Gross-equivalent** |
|----------|------------------------------|--------------------|----------------------:|
| **1 — Mixed** | Alex’s Roth FV ÷ 0.912 | Jordan pre-tax FV | **$1,272,690** |
| **2 — All pre-tax** | $0 | All nominal | **$1,231,497** |

### Step 3 — Readiness %

```text
readiness = min(100, round( gross_equiv / required_portfolio × 100 ))
```

| Scenario | Required PV | Gross-equiv | **Readiness** |
|----------|------------:|------------:|--------------:|
| **1 — Jordan pre-tax + Alex Roth** | $1,888,605 | $1,272,690 | **67%** |
| **2 — Both pre-tax** | $1,945,678 | $1,231,497 | **63%** |

**Freedom tab** and **Retirement bucket** bar show the **same %** when accounts are assigned and synced.

Partner mode does **not** change the formula — it only affects **contribution math** (whose salary funds the 401(k)) and **required portfolio** if incomes/SS differ. Here incomes and SS treatment are identical.

---

## Prompt — Scenario 1 (mixed)

```text
Enough App partner retirement progress. SS EXCLUDED both spouses.

Household $170k gross, 75% replacement → $127,500 lifestyle. TX MFJ. Retire 65, real 4.878%.

Jordan 401(k): $80k pre-tax, 8% employee + 3% employer on $100k salary ($11k/yr).
Alex Roth IRA: $40k Roth, $6k/yr, balanced.

Project each account 300 months. Sum nominal FV → expect ~$1,231,497.
Gross-equiv = pre-tax FV + Roth FV / (1 - 0.088). Required portfolio $1,888,605 (Roth-aware PV).

Expected readiness ≈ 67% (1,272,690 / 1,888,605).
```

---

## Prompt — Scenario 2 (all pre-tax)

```text
Same partner household as Scenario 1, but Alex Traditional IRA ($40k pre-tax, $6k/yr) instead of Roth IRA.

Same total $120k today, same $17k/yr savings, same nominal FV ~$1,231,497.
No Roth gross-up: gross-equiv = nominal FV = $1,231,497.
Required $1,945,678 (all pre-tax gross-up path).

Expected readiness ≈ 63% (1,231,497 / 1,945,678).
```

---

## Prompt — compare both

```text
Partner cross-check: identical except Alex saves Roth (S1) vs pre-tax (S2). SS excluded.

Same nominal projected $1,231,497.
S1 required $1,888,605, gross-equiv $1,272,690 → 67% ready.
S2 required $1,945,678, gross-equiv $1,231,497 → 63% ready.

Mixed scenario benefits from both lower required PV and higher gross-equiv.
```

---

## What is equal vs different

| | Equal? |
|--|--------|
| Required portfolio | **No** — $1,888,605 vs $1,945,678 |
| Nominal projected balance | Yes — $1,231,497 |
| Total savings rate | Yes — $17,000/yr |
| Readiness % | **No** — 67% vs 63% |
| Jordan’s 401(k) math | Yes |

---

## Files

- Test: `src/core/retirement/retirement-partner-roth-progress.test.ts`
- Output: `retirement-partner-roth-progress-output.txt`
