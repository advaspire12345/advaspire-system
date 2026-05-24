# Simulator report — voucher-cross-role-visibility

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-10T03-28-36
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

**Error:** `fillLabel: no textbox "Discount (RM)" in snapshot`

## Fixtures

```json
{
  "runId": "kolns1",
  "branchId": "f73f38bd-b4aa-4a63-93c9-2a0a3eb23e99",
  "courseId": null,
  "packageId": null,
  "users": [
    {
      "handle": "ga",
      "role": "group_admin",
      "id": "9a61dcdc-82e3-4cd3-8c55-27222945d365",
      "email": "__sim_kolns1_ga@sim.local",
      "profile": "lms-sim-kolns1-ga",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "75a2816b-49b7-48b0-8a6b-4cad7574fc5b",
      "email": "__sim_kolns1_ca@sim.local",
      "profile": "lms-sim-kolns1-ca",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "61d49992-4d83-4f4a-94be-3953b20771f3",
      "email": "__sim_kolns1_aa@sim.local",
      "profile": "lms-sim-kolns1-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "20cd7f10-7e13-494d-8821-16941a1fc121",
      "email": "__sim_kolns1_inst@sim.local",
      "profile": "lms-sim-kolns1-inst",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": []
}
```