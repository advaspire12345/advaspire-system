# Simulator report — voucher-cross-role-visibility

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-39-31
**Steps:** 1
**Drift findings:** 1

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | assistant_admin | `/voucher.permission` | /trial | — | /voucher | 🚫 NO_PERMISSION (redirected) |
| 1 | instructor | `/voucher.permission` | /attendance | — | /voucher | 🚫 NO_PERMISSION (redirected) |

## Per-step breakdown

### Step 1: `add_voucher` as **ga**

```yaml
code: "SIMVCH1"
discount_type: "fixed"
discount_value: 25
expiry_type: "monthly"
expiry_months: 3
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-39-31/screenshots/1-actor-ga.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-39-31/screenshots/1-observer-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-39-31/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-39-31/screenshots/1-observer-inst.png`

## Fixtures

```json
{
  "runId": "gsl3ys",
  "branchId": "9e6e264b-c813-4d9d-be09-77c8702612c8",
  "courseId": null,
  "packageId": null,
  "users": [
    {
      "handle": "ga",
      "role": "group_admin",
      "id": "6b4ffa23-a0a2-4405-a571-56716f008b55",
      "email": "__sim_gsl3ys_ga@sim.local",
      "profile": "lms-sim-gsl3ys-ga",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a0ec2096-1990-4ab5-81ae-fe3ea519ee7d",
      "email": "__sim_gsl3ys_ca@sim.local",
      "profile": "lms-sim-gsl3ys-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "66df2f8d-ad88-4897-9ba6-46b3054eab50",
      "email": "__sim_gsl3ys_aa@sim.local",
      "profile": "lms-sim-gsl3ys-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "feef1843-6fb3-41ac-978e-00068ec5295a",
      "email": "__sim_gsl3ys_inst@sim.local",
      "profile": "lms-sim-gsl3ys-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [
    "SIMVCH1"
  ]
}
```