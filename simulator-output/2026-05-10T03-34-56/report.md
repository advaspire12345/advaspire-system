# Simulator report — voucher-cross-role-visibility

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-34-56
**Steps:** 1
**Drift findings:** 3

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | assistant_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | company_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | assistant_admin | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |
| 1 | instructor | `voucher_table.row_visible(SIMVCH1)` | false | — | true | ❌ DRIFT (DOM != expected) |

## Per-step breakdown

### Step 1: `add_voucher` as **ga**

```yaml
code: "SIMVCH1"
discount_type: "fixed"
discount_value: 25
expiry_type: "monthly"
expiry_months: 3
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-34-56/screenshots/1-actor-ga.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-34-56/screenshots/1-observer-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-34-56/screenshots/1-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-34-56/screenshots/1-observer-inst.png`

## Fixtures

```json
{
  "runId": "ny3h3v",
  "branchId": "8e09c739-9e3a-4f8b-a6c9-52fee63e1947",
  "courseId": null,
  "packageId": null,
  "users": [
    {
      "handle": "ga",
      "role": "group_admin",
      "id": "e35fe95d-fd21-4742-8ac9-622974876b82",
      "email": "__sim_ny3h3v_ga@sim.local",
      "profile": "lms-sim-ny3h3v-ga",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "d03086f8-5a60-4e9a-a14a-f92ea830c10b",
      "email": "__sim_ny3h3v_ca@sim.local",
      "profile": "lms-sim-ny3h3v-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "a3550c92-bd5f-419e-a14b-c0fa887f70bd",
      "email": "__sim_ny3h3v_aa@sim.local",
      "profile": "lms-sim-ny3h3v-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "83146715-5fa0-4365-9f2b-e4e49cd113c3",
      "email": "__sim_ny3h3v_inst@sim.local",
      "profile": "lms-sim-ny3h3v-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [
    "SIMVCH1"
  ]
}
```