# Emergency & slush target cross-check scenarios

Copy a scenario + prompt to another AI to verify **Enough App** math.  
**Planning mode** (`solo` vs `partner`) does **not** change these targets — only **household expense inputs** matter.

**Reference “today” for payoff dates:** **May 28, 2026** (debts/mortgages with maturity before this month are excluded from the floor).

---

## Shared rules (Enough App)

### Emergency monthly floor

```text
floor = essentials_ex_housing
      + housing_obligation
      + sum(active_debt_payments)

housing_obligation:
  if rent  → monthly_housing_cost (rent)
  if own   → mortgage.monthly_payment IF mortgage active
             else monthly_housing_cost (HOA, taxes, etc.)

mortgage active when:
  hasMortgage = true, mortgagePaidOff = false,
  and current YYYYMM ≤ maturity YYYYMM

debt active when:
  maturityDate parses and current YYYYMM ≤ maturity YYYYMM
  (missing/invalid date → treated as still active)
```

### Targets

```text
emergency_target = round(floor × emergency_coverage_months)   // default 6, clamp 1–24
slush_target     = round(total_monthly × slush_coverage_months) // default 3

total_monthly = floor + monthly_discretionary
```

If `floor = 0`, emergency uses anchor: `9000 / 6 × months` (default bucket anchor).

**No FICA.** Discretionary is **not** in the emergency floor; it **is** in slush.

---

## Scenario 1 — Solo, renting

### Profile

| Field | Value |
|--------|--------|
| Planning mode | `solo` |
| Housing | **Rent** |
| Monthly essentials (ex housing/debt) | **$2,500** |
| Monthly housing (rent) | **$2,000** |
| Non-mortgage debts | none |
| Emergency coverage months | **6** |
| Slush coverage months | **3** |
| Monthly discretionary | **$800** |

### Calculation

| Step | Amount |
|------|-------:|
| Housing | $2,000 (rent) |
| Debts | $0 |
| **Floor** | $2,500 + $2,000 = **$4,500** |
| **Emergency target** | $4,500 × 6 = **$27,000** |
| Total monthly | $4,500 + $800 = $5,300 |
| **Slush target** | $5,300 × 3 = **$15,900** |

### Prompt for another AI

```text
Compute Enough App emergency and slush targets.

Rules:
- Emergency floor = essentials + rent + active debt payments (no discretionary).
- Emergency target = floor × 6 months.
- Slush target = (floor + discretionary) × 3 months.

Inputs: rent $2,000/mo, essentials $2,500/mo, no debts, discretionary $800/mo.

Expected: floor $4,500, emergency $27,000, slush $15,900.
Show step-by-step.
```

---

## Scenario 2 — Partner, own home, mortgage + car loan

### Profile

| Field | Value |
|--------|--------|
| Planning mode | `partner` (does not change math) |
| Housing | **Own** |
| Monthly essentials | **$3,000** |
| Monthly housing cost (non-mortgage) | **$400** (HOA, etc.) |
| Mortgage payment | **$2,800/mo**, payoff **12/2030** (`2030-12-01`) |
| Car loan | **$450/mo**, payoff **06/2035** (`2035-06-01`) |
| Emergency / slush months | **6** / **3** |
| Discretionary | **$1,200** |

### As of May 2026

Mortgage and car are **both active**. Do **not** add rent + mortgage (only mortgage payment counts for housing).

| Step | Amount |
|------|-------:|
| Housing | $2,800 (mortgage only) |
| Debts | $450 (car) |
| **Floor** | $3,000 + $2,800 + $450 = **$6,250** |
| **Emergency target** | $6,250 × 6 = **$37,500** |
| **Slush target** | ($6,250 + $1,200) × 3 = **$22,350** |

### Future checkpoints (optional)

| When | Housing in floor | Debts in floor | New floor (essentials still $3k) |
|------|------------------|----------------|-----------------------------------:|
| After **Jan 2031** (mortgage paid) | $400 (monthly housing only) | $450 | $3,850 → emergency **$23,100** |
| After **Jul 2035** (car paid) | $400 | $0 | $3,400 → emergency **$20,400** |

### Prompt for another AI

```text
Enough App emergency target (as of May 2026).

Own home: essentials $3,000, HOA/other housing $400 (not double-counted with mortgage).
Mortgage $2,800/mo until 2030-12-01. Car loan $450/mo until 2035-06-01.
Emergency months = 6, slush months = 3, discretionary $1,200.

Rules: if own with active mortgage, housing obligation = mortgage payment only (not rent field).
Debt included only if current YYYYMM ≤ payoff YYYYMM.

Expected May 2026: floor $6,250, emergency $37,500, slush $22,350.
Also show floor after mortgage ends (2031+) and after car ends (2035+).
```

---

## Scenario 3 — Partner, renting, three $500/mo debts (one paid off 01/2025)

### Profile

| Field | Value |
|--------|--------|
| Planning mode | `partner` |
| Housing | **Rent** **$2,200/mo** |
| Essentials | **$2,800** |
| Debts | each **$500/mo** payoff: **03/2028**, **11/2027**, **01/2025** |
| Emergency / slush months | **6** / **3** |
| Discretionary | **$1,000** |

### As of May 2026

Payoff **2025-01** → current month **2026-05** is **after** January 2025 → debt **excluded**.

| Debt | Maturity | Active May 2026? | In floor? |
|------|----------|------------------|-----------|
| Credit card A | 2028-03 | yes | $500 |
| Personal loan | 2027-11 | yes | $500 |
| Card paid off | 2025-01 | **no** | **$0** |

| Step | Amount |
|------|-------:|
| **Floor** | $2,800 + $2,200 + $500 + $500 = **$6,000** |
| **Emergency target** | $6,000 × 6 = **$36,000** |
| **Slush target** | ($6,000 + $1,000) × 3 = **$21,000** |

If the $500 “paid off 01/2025” debt were still counted (wrong): floor would be **$6,500**, emergency **$39,000**.

### Prompt for another AI

```text
Enough App emergency target. Today = May 2026.

Rent $2,200, essentials $2,800, discretionary $1,000.
Three debts $500/mo with payoffs: 2028-03, 2027-11, and 2025-01.
Rule: debt counts only if current YYYYMM ≤ payoff YYYYMM (inclusive through payoff month).

Expected: only two debts active → floor $6,000, emergency $36,000, slush $21,000.
Show what happens if 2025-01 debt were incorrectly still included ($6,500 floor).
```

---

## Reproduce in repo

```bash
npx vitest run src/core/buckets/emergency-crosscheck-scenarios.test.ts
```

Source: `src/core/buckets/expense-targets.ts`
