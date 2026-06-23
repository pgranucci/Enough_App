# Required portfolio at retirement — partner + variable income

How much the household portfolio must be worth **at the first retirement year** (in **today’s dollars**) to fund the plan. Enough App = **PV of year-by-year gross portfolio withdrawals**, not a single “annual need × years” annuity.

**Run:** `npx vitest run src/core/retirement/required-portfolio-partner-crosscheck.test.ts`  
**Fixture:** `src/core/retirement/fixtures-complex-partner.ts`  
**Output file:** `required-portfolio-partner-output.txt` (after test run)

---

## Household setup

| Field | Value |
|--------|--------|
| Planning | **Partner** (Jordan 38, Alex 41 today) |
| Household gross income | **$205,000** ($120k + $85k) |
| Income replacement | **75%** → lifestyle gross **$153,750** |
| Lifestyle net (FL, married joint, app tax model) | **$136,697** |
| Self retirement age | **62** |
| Partner retirement age | **64** (does not delay funding start — withdrawals begin at **self** age 62) |
| Life expectancy | **92** (self) / **94** (partner) |
| **Funding years on self timeline** | **30** → ages **62 through 92** (**31** calendar years) |
| Tax location in retirement | **Florida**, **married filing jointly** |
| Discount rate | **Real 4.878%** (7.5% nominal, 2.5% inflation, Fisher) |

### Variable income (gross, flat today’s dollars)

| Source | Amount | When |
|--------|--------|------|
| Self Social Security | $28,000/yr | Self age **≥ 62** |
| Partner Social Security | $22,000/yr | Partner age **≥ 64** (≈ self age **≥ 61** with this DOB gap) |
| Pension | $12,000/yr | From self age **62** |
| Consulting (assigned **self**) | $1,500/mo = $18,000/yr | Self ages **62–70** |
| Rental (assigned **partner**) | $2,000/mo = $24,000/yr | Partner ages **64–85** (≈ self **61–82**) |

**Partner age when self is age *a*:** `41 + (a − 38) = a + 3`.

Other income in a year = sum of streams active for that **self age** and **partner age** (not a flat amount every year).

---

## Algorithm

For each self age `a` from **62** to **92**:

```text
desired_net     = net(lifestyle_gross $153,750)   // constant ≈ $136,697

ss_net          = net($28k) if a ≥ 62 else 0
partner_ss_net  = net($22k) if partner_age(a) ≥ 64 else 0
pension_net     = net($12k) from a ≥ 62
other_net       = net(active consulting + rental gross for that year)

net_need(a)     = max(0, desired_net − ss_net − partner_ss_net − pension_net − other_net)

gross_wd(a)     = net_need(a) / (1 − t)        // t = effective tax on $153,750 gross ≈ 11.1%
```

**Required portfolio:**

```text
PV = Σ_{k=0}^{30}  gross_wd(62 + k) / (1.04878)^k
```

No FICA on withdrawals — federal + state income tax only.

---

## Year-by-year plateaus (reference)

App tax model converts each gross income line to net (amounts below are **app outputs**).

| Self ages | Partner age (≈) | Other net | Net portfolio need | Gross withdrawal |
|----------|-----------------|----------:|-------------------:|-----------------:|
| **62–70** | 65–73 | **$40,800** | **$33,897** | **$38,129** |
| **71–81** | 74–84 | **$24,000** (rental only) | **$50,697** | **$57,027** |
| **82–92** | 85–95 | **$0** | **$74,697** | **$84,024** |

Sample rows:

| Self | Partner | SS net | Partner SS | Other net | Net need | Gross w/d |
|-----:|--------:|-------:|-----------:|----------:|---------:|----------:|
| 62 | 65 | $28,000 | $22,000 | $40,800 | $33,897 | $38,129 |
| 71 | 74 | $28,000 | $22,000 | $24,000 | $50,697 | $57,027 |
| 92 | 95 | $28,000 | $22,000 | $0 | $74,697 | $84,024 |

---

## Expected answer (Enough App)

| Metric | Value |
|--------|------:|
| **Required portfolio at age 62** | **$885,242** |
| First-year net gap (age 62) | $33,897 |
| First-year gross withdrawal | $38,129 |
| Schedule years | 31 |
| Funding years metric | 30 |

*(Projected balance today and readiness % depend on linked 401(k)/brokerage accounts — not required to reproduce the **target** PV.)*

---

## Prompt for another AI

```text
Calculate the required retirement portfolio (present value at age 62) for a partner household.

SETUP
- Lifestyle gross $153,750/yr flat (today's dollars); net ≈ $136,697 after FL married-joint income tax.
- Funding ages 62–92 inclusive (31 years). Discount real rate 4.878% (Fisher from 7.5% nom, 2.5% inflation).
- Gross-up portfolio withdrawals: divide net need by (1 - t), t ≈ effective tax on $153,750 gross ≈ 11.1%. No FICA.

INCOME (gross → use same tax model or these NET figures from calibration):
- Self SS net $28,000/yr from age 62
- Partner SS net $22,000/yr when partner age ≥ 64 (partner_age = self_age + 3)
- Pension net from age 62 (gross $12k — compute net or use app ~$10,700 if you model tax)
- Other net by self age:
  - 62–70: $40,800 (consulting + rental)
  - 71–81: $24,000 (rental only)
  - 82–92: $0

NET NEED each year = max(0, 136697 - SS - partner_SS - pension_net - other_net)
GROSS WD = net_need / (1 - t)

PV = sum of gross_wd at ages 62..92 discounted by (1.04878)^year_index.

Expected PV ≈ $885,242. First year net need ≈ $33,897, gross withdrawal ≈ $38,129.
Show three sample years (62, 71, 92) and the PV sum setup.
```

**Tip for cross-check:** If the other agent lacks your exact tax table, have them use the **net need / gross withdrawal plateaus** above and still discount the **gross** series — PV should land within ~$5k of **$885,242**.

---

## What this example is not testing

- Portfolio **growth** from today to 62 (401k projection) — separate `projectGrossEquivalentPortfolioAtRetirement` path.
- **Roth vs pre-tax** on the required PV (schedule uses pre-tax gross-up; readiness uses account mix).
- Inflating the $153,750 lifestyle each year (stays flat in today’s dollars).
