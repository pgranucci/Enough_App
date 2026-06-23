# Roth-aware withdrawal cross-check (post-wiring)

Copy this file to another calculator or AI to reproduce **locked reference numbers** from the Enough app test suite.

**Last verified:** all **108** vitest tests passing after wiring `grossAnnualWithdrawalForNetNeed` into the production year-by-year schedule.

---

## Global model assumptions

| Topic | Enough app behavior |
|--------|---------------------|
| **Dollar mode** | Most scenarios use **today’s (real) dollars** for lifestyle and income streams — spending goal is **flat** each retirement year (no COLA escalation). |
| **Discount / growth in retirement** | Fisher real return: `r_real = (1 + r_nom) / (1 + π) − 1`. Default **7.5%** nominal, **2.5%** inflation → **≈ 4.878%** real. Colorado validation uses an explicit **2.5%** real return in decumulation. |
| **Tax on lifestyle reference** | Effective **federal + state income tax** on the **gross spending goal** (not marginal bracket). Used as rate **t** for portfolio gross-up. **No FICA / Medicare** on portfolio withdrawals. |
| **Roth share (s)** | `s = rothBalance / (traditionalBalance + rothBalance)` at retirement. Taxable brokerage is synced into **traditional** for this ratio. |
| **Portfolio gross-up (now live in schedule)** | Per year: solve **G** so `(known_gross + G) − tax(known_gross + G×(1−s)) = lifestyle_net`. Roth portion of **G** is tax-free; tax recomputed on full taxable household income each year. |
| **Required portfolio PV** | Present value of **year-by-year G** at retirement real return. **Depends on Roth share** and **income timeline** (SS, partner work, etc.). |
| **Readiness %** | `min(100, round(projected_gross_equiv / required_PV × 100))` where `gross_equiv = pre_tax + taxable + roth / (1 − t)`. |

### Core formulas

```text
lifestyle_net = net after tax if lifestyle gross were sole income (reference)

Each retirement year:
  known_gross(a) = SS + partner_SS + pension + other + partner_employment (all gross)
  taxable_gross(a, G) = known_gross(a) + G × (1 − s)     ← Roth share of G excluded
  Find G(a) such that: known_gross(a) + G(a) − tax(taxable_gross) = lifestyle_net

PV = Σ G(a) / (1 + r_real)^(a − retirement_age)
readiness = projected_gross_equiv / PV
```

**Legacy fixed-rate approximation** (deprecated for schedule; still used for Roth gross-equivalent display):

```text
G ≈ N × (s + (1 − s) / (1 − t))    where t = effective rate on lifestyle gross alone
```

---

## Scenario 1 — Demo TX retire-at-55 (part-time + deferred SS)

### Timeline & assumptions

| Field | Value |
|--------|--------|
| Retire / current age | **55** |
| Life expectancy | **90** (35 funding years) |
| Lifestyle gross (flat) | **$60,000/yr** |
| Social Security gross | **$24,000/yr** from age **62** |
| Part-time gross | **$2,000/mo** ($24k/yr), ages **65–70** |
| State / filing | **Texas**, **single** |
| Return / inflation | **7.5% / 2.5%** → real **≈ 4.878%** |
| Contributions | **$0** (balance test cases) |

### Tax calibration

| Gross source | Net (app) |
|--------------|----------:|
| $60,000 lifestyle | **$54,839** |
| $24,000 (SS or part-time) | **$23,100** |

**Withdrawal tax rate t on $60k reference:** **8.6%**

### Net portfolio need by age band

| Ages | Net portfolio need N |
|------|---------------------:|
| 55–61 | **$54,839** |
| 62–64, 71–90 | **$31,739** |
| 65–70 | **$8,639** |

### Required PV by Roth mix (locked)

| Mix | Roth share s | Required PV | Age-55 gross withdrawal G |
|-----|-------------:|------------:|--------------------------:|
| 100% pre-tax | 0% | **$682,352** | **$59,999** |
| 50/50 nominal ($341,176 each) | 50% | **$653,011** | **$57,419** |
| 100% Roth | 100% | **$623,670** | **$54,839** |

### Balance test cases @ age 55

| Case | Traditional | Roth | Required PV | Gross-equiv | Readiness |
|------|------------:|-----:|------------:|------------:|----------:|
| A — 100% funded pre-tax | $682,352 | $0 | $682,352 | $682,352 | **100%** |
| B — 100% funded Roth | $0 | $623,670 | $623,670 | $682,352 | **100%** |
| C — 50/50 funded | $341,176 | $341,176 | $653,011 | $714,454 | **100%** |
| D — 88% pre-tax | $600,000 | $0 | $682,352 | $600,000 | **88%** |
| E — 88% Roth | $0 | $550,000 | $623,670 | $601,751 | **96%** |

**Reproduce:** `npx vitest run src/core/retirement/retirement-roth-crosscheck.test.ts` → `retirement-roth-crosscheck-output.txt`

---

## Scenario 2 — Solo TX accumulation (age 40 → 65)

### Timeline & assumptions

| Field | Value |
|--------|--------|
| Current age → retirement | **40 → 65** (25 years) |
| Life expectancy | **95** (30 funding years) |
| Lifestyle gross | **$80,000/yr** |
| Social Security | **$0** (excluded) |
| Balances today | **$100,000** pre-tax + **$50,000** Roth (**33%** Roth share) |
| Monthly contributions | **$1,000/mo** |
| State / filing | **Texas**, **single** |
| Return / inflation | **7.5% / 2.5%** |

### Locked outputs

| Metric | Value |
|--------|------:|
| Desired net lifestyle @ retirement | **$70,786** |
| First-year net portfolio gap | **$70,786** |
| First-year gross withdrawal (Roth-aware) | **$76,918** |
| Required portfolio PV | **$1,275,955** |
| Projected gross-equiv @ 65 | **$1,131,026** |
| Readiness | **89%** |
| Real return in retirement | **4.88%** |

**Reproduce:** `npx vitest run src/core/retirement/retirement-planning.fixtures.test.ts`

---

## Scenario 3 — Colorado couple (real-dollar validation engine)

Separate validation path: **real dollars throughout**, explicit **5%** real return in accumulation, **2.5%** real in decumulation.

### Household timeline

| Field | Value |
|--------|--------|
| User age → retirement | **40 → 60** (20 years to accumulate) |
| Partner age @ user retirement | **55** (partner is 35 today) |
| Partner retires | age **65** (user age **70**) |
| Longevity | both **95** (user ages **60–95**, 36 years) |
| Filing / state | **Married filing jointly**, **Colorado** |
| Spending goal (gross, flat) | **$120,000/yr** every retirement year |

### Assets & contributions (today)

| Bucket | Balance | Annual contrib |
|--------|--------:|---------------:|
| Pre-tax | $400,000 | $24,000 |
| Roth | $200,000 | $12,000 |
| Taxable | $100,000 | $6,000 |

**Accumulation real return:** **5%** over 20 years.

### Income streams (gross, real)

| Stream | Amount | Timing |
|--------|-------:|--------|
| Partner employment | **$70,000/yr** | User ages **60–64** (5 years) |
| User Social Security | **$36,000/yr** | From user age **67** |
| Partner Social Security | **$24,000/yr** | From partner age **67** (user age **72**) |

### Tax calibration @ retirement

| Metric | Value |
|--------|------:|
| Lifestyle net from $120k gross | **$104,397** |
| Withdrawal tax rate **t** on $120k (MFJ CO) | **13.0%** |
| Roth share at retirement (projected) | **28.6%** ($947,291 / $3,315,517) |

### Projected balances @ user age 60

| Bucket | Projected balance |
|--------|------------------:|
| Pre-tax | **$1,894,581** |
| Roth | **$947,291** |
| Taxable | **$473,645** |
| **Total nominal** | **$3,315,517** |
| **Gross-equivalent** | **$3,457,066** |

### Required PV by Roth mix @ 2.5% real decumulation

| Mix | Required PV |
|-----|------------:|
| Actual mix (29% Roth) | **$1,453,620** |
| All pre-tax (hypothetical) | **$1,509,695** |
| All Roth (hypothetical) | **$1,313,434** |

**Readiness (actual mix):** **100%**

At **4%** real decumulation return, required PV drops to **$1,197,456**.

### Sample years — funding breakdown

**Age 60 — partner working**

| Line | Gross | Notes |
|------|------:|-------|
| Spending goal | $120,000 | flat |
| Partner employment | $70,000 | |
| Portfolio withdrawal G | **$46,261** | Roth-aware (vs $48,046 if 100% pre-tax gross-up) |
| Total taxes (est.) | $14,990 | eff. **12.9%** (fed $9,874 + CO $5,115) |
| Net portfolio need N | **$41,800** | |

**Age 65 — bridge (no partner work, no SS yet)**

| Line | Gross |
|------|------:|
| Spending goal | $120,000 |
| Portfolio withdrawal G | **$115,540** |
| Total taxes | $14,872 |
| Net portfolio need N | **$104,397** (= full lifestyle net) |

**Age 72 — both on Social Security**

| Line | Gross |
|------|------:|
| Spending goal | $120,000 |
| User SS | $36,000 |
| Partner SS | $24,000 |
| Portfolio withdrawal G | **$52,721** |
| Total taxes | $14,410 |
| Net portfolio need N | **$47,637** |

### Milestone comparison (Roth-aware vs hypothetical pre-tax-only gross-up)

| User age | Phase | Net need N | Roth-aware G | Pre-tax-only G | Annual savings |
|---------:|-------|----------:|-------------:|---------------:|---------------:|
| 60 | Partner working | $41,800 | **$46,261** | $48,046 | $1,785 |
| 65 | Bridge | $104,397 | **$115,540** | $120,000 | $4,457 |
| 67 | User SS | $70,581 | **$78,114** | $81,128 | $3,014 |
| 72 | Both SS | $47,637 | **$52,721** | $54,755 | $2,034 |

**Reproduce:** `npx vitest run src/core/retirement/retirement-readiness-validation.test.ts`

---

## Scenario 4 — Complex partner FL (variable income streams)

### Timeline & assumptions

| Field | Value |
|--------|--------|
| Household | Jordan (38) + Alex (41), **partner mode** |
| Household gross income | **$205,000** |
| Income replacement | **75%** → lifestyle **$153,750** gross |
| Self retires | **62**; partner **64** |
| Life expectancy | **92 / 94** (31 funding years) |
| State / filing | **Florida**, **MFJ** |
| Return / inflation | **7.5% / 2.5%** |

### Income streams (gross)

| Stream | Amount | Timing |
|--------|-------:|--------|
| Self SS | $28,000/yr | From self age 62 |
| Partner SS | $22,000/yr | From partner age 64 |
| Pension | $12,000/yr | From self retirement |
| Consulting (self) | $1,500/mo | Self ages 62–70 |
| Rental (partner) | $2,000/mo | Partner ages 64–85 |

Roth share comes from assigned account balances (see fixture); required PV reflects Roth-aware gross-up.

### Sample year rows (self age | partner age | net need | gross w/d)

| Self | Partner | Net need | Gross w/d |
|-----:|--------:|---------:|----------:|
| 62 | 65 | $33,897 | **$37,199** |
| 71 | 74 | $50,697 | **$55,636** |
| 92 | 95 | $74,697 | **$81,974** |

**Required portfolio PV @ age 62:** **$863,646**

**Reproduce:** `npx vitest run src/core/retirement/required-portfolio-partner-crosscheck.test.ts`

---

## Scenario 5 — Partner Roth vs pre-tax progress (SS excluded)

Same **$120,000** nominal savings today; only Alex’s IRA type differs.

### Shared assumptions

| Field | Value |
|--------|--------|
| Jordan 40, Alex 42 | Partner mode |
| Household gross | **$170,000** → lifestyle **$127,500** (75%) |
| Retire both | **65**; life **90** |
| SS | **Excluded** both spouses |
| State / filing | **Texas**, **MFJ** |
| Withdrawal tax rate on $127.5k | **8.8%** |

### Accounts

- Jordan 401(k): **$80k** pre-tax, 8% deferral + 3% match on $100k salary  
- Alex: **$40k** + **$6k/yr** — **Roth IRA** (S1) or **Traditional IRA** (S2)  
- Total monthly savings: **~$1,417/mo** (both scenarios)

### Locked comparison

| Metric | Mixed (33% Roth) | All pre-tax |
|--------|----------------:|------------:|
| Required PV | **$1,888,605** | **$1,945,678** |
| Nominal FV @ 65 | $1,231,497 | $1,231,497 |
| Gross-equiv FV @ 65 | **$1,272,690** | $1,231,497 |
| Readiness | **67%** | **63%** |

**Reproduce:** `npx vitest run src/core/retirement/retirement-partner-roth-progress.test.ts`

---

## Scenario 6 — Continuing partner employment (FL)

Partner keeps **$85,000/yr** salary until partner retirement age **65** (user retires **62**).

| Field | Value |
|--------|--------|
| Lifestyle gross | **$153,750** |
| SS | Excluded |
| Balances | $355k pre-tax + $100k Roth |
| With partner employment PV | **$2,094,126** |
| Without partner employment PV | **$2,488,500** |

**Reproduce:** `npx vitest run src/core/retirement/continuing-employment-income.test.ts`

---

## Scenario 7 — Roth vs pre-tax savings path (solo, SS excluded)

| Field | Value |
|--------|--------|
| Age 40 → 65 | Save **$500/mo** |
| Starting balance | **$50,000** (all Roth **or** all pre-tax) |
| Lifestyle gross | **$60,000**; TX single |
| Withdrawal tax rate | **8.6%** |

| Metric | Save Roth only | Save pre-tax only |
|--------|---------------:|------------------:|
| Required PV | **$909,696** | **$995,291** |
| Nominal FV @ 65 | $459,800 | $459,800 |
| Gross-equiv FV | **$503,063** | $459,800 |
| Readiness | **55%** | **46%** |

**Reproduce:** `npx vitest run src/core/retirement/retirement-roth-vs-pretax-progress.test.ts`

---

## Scenario 8 — CA vs TX (higher tax → higher required PV)

Same solo TX fixture as Scenario 2, but **California MFJ** retirement location:

| Location | Required PV | Readiness (same balances) |
|----------|------------:|--------------------------:|
| Texas single | **$995,291** (100% pre-tax path) / **$1,275,955** (33% Roth fixture) | 89% |
| California MFJ | **$1,288,063** | **87%** |

Higher **t** in CA increases gross withdrawals and required PV.

**Reproduce:** `npx vitest run src/core/retirement/retirement-brokerage-divergence.test.ts`

---

## Prompt for another AI

```text
Reproduce Enough app retirement numbers using docs/ROTH_AWARE_WITHDRAWAL_CROSSCHECK.md.

1. Confirm Roth-aware gross-up: G = N × (s + (1−s)/(1−t)).
2. Scenario 1: Required PV $682,352 (0% Roth), $653,011 (50%), $623,670 (100% Roth).
3. Scenario 3: CO couple — required PV $1,453,620 @ 2.5% real; age-60 gross w/d $46,261 with 28.6% Roth share and t=13%.
4. Scenario 5: Partner mixed vs all pre-tax — PV $1,888,605 vs $1,945,678; readiness 67% vs 63%.
5. Show net portfolio need drops when partner employment or SS covers part of lifestyle net.
6. No FICA on portfolio withdrawals — income tax only.
```

---

## Test commands (full suite)

```bash
npx vitest run                                          # all 108 tests
npx vitest run src/core/retirement/retirement-roth-crosscheck.test.ts
npx vitest run src/core/retirement/retirement-readiness-validation.test.ts
npx vitest run src/core/retirement/retirement-schedule-roth-grossup.test.ts
```

---

## Related files

| File | Purpose |
|------|---------|
| `utils/retirement-income-tax.ts` | `grossAnnualWithdrawalForNetNeed`, `preTaxWithdrawalTaxRatePercent` |
| `src/core/retirement/year-by-year-income.ts` | Production schedule + PV |
| `src/core/retirement/readiness-validation-engine.ts` | Colorado real-dollar validation |
| `docs/RETIREMENT_ROTH_CROSSCHECK_SCENARIO.md` | Scenario 1 detail (demo age-55) |
| `docs/RETIREMENT_CROSSCHECK_SCENARIO.md` | Base income-only cross-check |
