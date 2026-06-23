# Retirement FV — short-term vs aggressive (simple cross-check)

Tests **`simulateRetirement`** / **`futureValueNominal`**: balance projected to retirement in **today’s dollars** using a **real** return (Fisher).

**Run:** `npx vitest run src/core/retirement/retirement-fv-mix-crosscheck.test.ts`

---

## Shared inputs (both cases)

| Field | Value |
|--------|--------|
| Current age | 45 |
| Retirement age | 55 |
| **Years** | **10** → **120 months** |
| Balance today | **$50,000** |
| Monthly contribution | **$0** |
| Inflation assumption | **2.5%** |

Output is **rounded** to whole dollars.

---

## FV formula (Enough App)

```text
real_annual = (1 + nominal/100) / (1 + inflation/100) − 1   // as decimal for loop

balance = balance_today
for month = 1 … 120:
  balance += monthly_contribution   // $0 here
  if month mod 12 == 0:
    balance *= (1 + real_annual)

projected_balance = round(balance)
```

Growth is applied at **month 12, 24, …, 120** (end of each year in the loop).  
Contributions are added **at the start of each month** (before that year’s growth if the month is a multiple of 12).

---

## Case A — Short-term / cash mix

| | |
|--|--|
| Nominal return | **0%** |
| Real return | **(1/1.025) − 1 ≈ −2.439%** |

```text
After 10 yearly steps: 50,000 × (1 − 0.02439…)^10 ≈ 39,060
```

**Expected `projectedBalanceAtRetirement`:** **$39,060**

---

## Case B — Aggressive mix

| | |
|--|--|
| Nominal return | **10%** (default preset) |
| Real return | **(1.10/1.025) − 1 ≈ 7.317%** |

```text
After 10 yearly steps: 50,000 × (1.07317…)^10 ≈ 101,311
```

**Expected `projectedBalanceAtRetirement`:** **$101,311**

---

## Prompt for another AI

```text
Enough App retirement FV (simulateRetirement / futureValueNominal).

Same inputs both cases: 120 months, start $50,000, $0/month, inflation 2.5%.
Project in today's dollars using REAL return (Fisher).

Case A — short-term/cash: 0% nominal → real = (1/1.025)-1.
Case B — aggressive: 10% nominal → real = (1.10/1.025)-1.

Loop: each month add $0; at months 12,24,...,120 multiply balance by (1+real).
Round final balance to integer dollars.

Expected: Case A $39,060. Case B $101,311.
Show year-by-year balance after each multiply for one case to verify the loop.
```

---

## Notes

- Profile **“Expected Annual Return in Retirement”** is a separate field; per-account FV uses the **mix** rate (cash → 0% nominal, aggressive → 10% with default presets).
- Custom overrides in Profile → Assumptions change nominal mix rates; inflation still feeds Fisher.
