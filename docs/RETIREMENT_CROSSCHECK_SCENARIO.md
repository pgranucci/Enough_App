# Retirement calculation cross-check scenario

Copy everything below into another calculator / AI and ask it to reproduce the **reference answers** at the end. Amounts are in **today’s dollars** (no inflation escalation of the lifestyle target year-by-year).

---

## Scenario narrative

One person, **solo**, **Texas** resident, **single** tax filing status in retirement.

- **Retires at age 55** and needs the portfolio to fund spending from age **55** through age **90** (life expectancy 90).
- Wants **$60,000 gross** annual lifestyle spending in retirement (before tax).
- **Social Security**: **$24,000 gross per year**, but benefits **do not start until age 62** (claim age 62).
- **Part-time work**: **$2,000 per month gross** (**$24,000 per year**), only from age **65** through age **70** (inclusive).
- **No pension**, no partner, no other income.
- Investment assumptions for discounting only: **7.5% nominal** return, **2.5% inflation** → use **real return** via Fisher equation for PV.

Current age (only used for timeline) = **50**. Retirement math starts at **retirement age 55**.

---

## Inputs (single table)

| Field | Value |
|--------|--------|
| Retirement age | 55 |
| Life expectancy | 90 |
| Desired annual gross lifestyle | $60,000 |
| Social Security gross (annual) | $24,000 |
| Social Security claim age | 62 |
| Part-time gross | $2,000/month = $24,000/year |
| Part-time active ages | 65–70 inclusive |
| Pension | $0 |
| State | Texas (FL/TX: no state income tax on wages in this model) |
| Filing status | Single |
| Nominal return (for discounting) | 7.5% |
| Inflation assumption | 2.5% |
| Funding years | 90 − 55 = **35 years** (ages 55 through 90 inclusive) |

---

## Tax rules (match the app’s approach)

The Enough app uses a **simplified US federal + state** income tax estimator (`estimateAnnualIncomeTax`) for:

1. Converting each **gross** income line to **net** (lifestyle, SS, part-time).
2. Computing an **effective tax rate %** on **$60,000 gross** reference income; call that rate **t** (as a decimal).

**Portfolio gross withdrawal** for a given year (100% pre-tax withdrawal, no Roth in this scenario):

```text
gross_portfolio_withdrawal = net_portfolio_need / (1 − t)
```

(clamp **t** to [0, 0.6] if implementing the app literally.)

**Important:** If your tax model differs from a simplified 2024-style federal single + no TX state tax, **net** lines may differ slightly. Compare structure first; net amounts within ~$500/year are acceptable.

### Reference net amounts from the app (for calibration)

| Gross source | Gross | Net (app) |
|--------------|-------|-----------|
| Lifestyle | $60,000 | **$54,839** |
| Social Security | $24,000 | **$23,100** |
| Part-time | $24,000 | **$23,100** |

Effective rate **t** on $60,000 gross reference ≈ **8.60%** (because $54,839 / $60,000 ≈ 91.4% net → gross-up divisor ≈ 1.094).

---

## Year-by-year algorithm (ages 55–90)

For each integer age **a** from **55** to **90**:

### Step A — Other income gross

```text
other_gross(a) = 24,000  if 65 ≤ a ≤ 70
                 = 0      otherwise
```

### Step B — Social Security gross

```text
ss_gross(a) = 24,000  if a ≥ 62
              = 0      otherwise
```

### Step C — Convert to net

```text
lifestyle_net = 54,839   (constant every year)

ss_net(a)     = gross_to_net(ss_gross(a))
other_net(a)  = gross_to_net(other_gross(a))
```

Use the app’s net calibration table above, or your own tax model.

### Step D — Net amount the portfolio must cover

```text
net_portfolio_need(a) = max(0, lifestyle_net − ss_net(a) − other_net(a))
```

### Step E — Gross portfolio withdrawal that year

```text
gross_withdrawal(a) = net_portfolio_need(a) / (1 − t)
```

---

## Expected year-by-year results (app reference)

| Age | SS net | Other net | Net portfolio need | Gross withdrawal |
|-----|--------|-----------|-------------------:|-----------------:|
| 55 | $0 | $0 | $54,839 | $59,999 |
| 56 | $0 | $0 | $54,839 | $59,999 |
| 57 | $0 | $0 | $54,839 | $59,999 |
| 58 | $0 | $0 | $54,839 | $59,999 |
| 59 | $0 | $0 | $54,839 | $59,999 |
| 60 | $0 | $0 | $54,839 | $59,999 |
| 61 | $0 | $0 | $54,839 | $59,999 |
| 62 | $23,100 | $0 | $31,739 | $34,725 |
| 63 | $23,100 | $0 | $31,739 | $34,725 |
| 64 | $23,100 | $0 | $31,739 | $34,725 |
| 65 | $23,100 | $23,100 | $8,639 | $9,452 |
| 66 | $23,100 | $23,100 | $8,639 | $9,452 |
| 67 | $23,100 | $23,100 | $8,639 | $9,452 |
| 68 | $23,100 | $23,100 | $8,639 | $9,452 |
| 69 | $23,100 | $23,100 | $8,639 | $9,452 |
| 70 | $23,100 | $23,100 | $8,639 | $9,452 |
| 71 | $23,100 | $0 | $31,739 | $34,725 |
| 72 | $23,100 | $0 | $31,739 | $34,725 |
| … | … | … | … | … |
| 90 | $23,100 | $0 | $31,739 | $34,725 |

**Three plateaus:** ages 55–61 (full need), 62–64 and 71–90 (SS only), 65–70 (SS + part-time).

---

## Required portfolio (present value)

Real return (Fisher):

```text
r_nom = 0.075
i     = 0.025
r_real = (1 + r_nom) / (1 + i) − 1 ≈ 0.0487804878  (≈ 4.878%)
```

Let **W₀ … W₃₄** be `gross_withdrawal(55)` … `gross_withdrawal(90)` (35 payments).

**PV at age 55 (start of retirement):**

```text
required_portfolio = Σ_{k=0}^{34}  W_k / (1 + r_real)^k
```

### Reference answer (app)

| Metric | Value |
|--------|------:|
| First-year net portfolio gap (age 55) | **$54,839** |
| First-year gross portfolio withdrawal | **$59,999** |
| **Required portfolio (PV)** | **$682,352** |
| Funding horizon | **35 years** |

---

## Prompt you can paste to another AI

```text
Using the specification in "Retirement calculation cross-check scenario" above:

1. Build the year-by-year table ages 55–90 (SS net, other net, net portfolio need, gross withdrawal).
2. Compute required_portfolio = PV at age 55 of the 35 annual gross withdrawals, discounting at real return 4.878% (Fisher from 7.5% nominal and 2.5% inflation).
3. Report three summary numbers: first-year net gap, first-year gross withdrawal, required portfolio PV.
4. Compare to reference: net gap $54,839, gross withdrawal $59,999, required portfolio $682,352.

Show formulas and a few sample years (55, 62, 65, 71, 90) so I can verify timing logic.
```

---

## How to reproduce in Enough App

1. Profile: single, Texas.
2. Retirement: retire 55, life 90, desired gross income $60,000.
3. SS estimate $24,000, claim age 62.
4. Add other income stream: $2,000/mo, start 65, end 70.
5. Assumptions: 7.5% return, 2.5% inflation.
6. Run: `npx vitest run src/core/retirement/retirement-demo.test.ts` and read `retirement-demo-output.txt`.

---

## What this scenario does NOT test

- Portfolio **growth** to retirement (401k balances, contributions) — separate projection path.
- **Readiness %** — needs projected balance at retirement vs required portfolio.
- **Partner** / staggered spouse retirements — see `retirement-stress-partner.test.ts`.
- Inflating the **$60,000 lifestyle** each year for inflation (target stays flat in today’s dollars).
