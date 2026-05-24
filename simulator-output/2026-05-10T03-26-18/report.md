# Simulator report — voucher-cross-role-visibility

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-26-18
**Steps:** 1
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|

## Per-step breakdown

### Step 1: `add_voucher` as **ga**

```yaml
code: "SIMVCH1"
discount_type: "fixed"
discount_value: 25
expiry_type: "monthly"
expiry_months: 3
```

**Error:** `selectByLabel: no option "Fixed" after opening "Discount Type"`

## Fixtures

```json
{
  "runId": "pba6sh",
  "branchId": "8ad659b0-a8d5-4a8d-bd33-0fd087ff1aed",
  "courseId": null,
  "packageId": null,
  "users": [
    {
      "handle": "ga",
      "role": "group_admin",
      "id": "6eec6f9a-8075-4d15-a5b4-21a6184be5e4",
      "email": "__sim_pba6sh_ga@sim.local",
      "profile": "lms-sim-pba6sh-ga",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "9c46853f-bf15-4ddf-9757-9c41003bf816",
      "email": "__sim_pba6sh_ca@sim.local",
      "profile": "lms-sim-pba6sh-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "00289303-e784-4d87-bf8f-bbdc3a293a24",
      "email": "__sim_pba6sh_aa@sim.local",
      "profile": "lms-sim-pba6sh-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "92037225-83a1-456e-bb42-efeaffbfe98c",
      "email": "__sim_pba6sh_inst@sim.local",
      "profile": "lms-sim-pba6sh-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": []
}
```