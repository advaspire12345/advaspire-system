# Simulator report — scenario-import-dedup

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-45-45
**Steps:** 2
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch d3e8"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-45-45/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-45-45/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-45-45/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch d3e8"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-45-45/screenshots/2-actor-sa.png`

**Error:** `agent-browser failed: npx --yes agent-browser --session sim-d3e8u6-aa open http://localhost:3000/student
✗ Operation timed out. The page may still be loading or the element may not exist.
`

## Fixtures

```json
{
  "runId": "d3e8u6",
  "branchId": "6fe314df-097a-405e-b95c-3bb1347ec960",
  "branchName": "__sim_d3e8u6_Sim Dedup Branch",
  "courseId": "93979fb1-2ea2-4df8-afcc-696efed91fc0",
  "courseName": "__sim_d3e8u6_DedupCourse",
  "packageId": "9a14b636-9faa-4ccf-b156-d717a1be6a2d",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "19105a3c-69dd-4e67-9157-2920e38e77ff",
      "email": "__sim_d3e8u6_sa@sim.local",
      "profile": "lms-sim-d3e8u6-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f25726b6-61ac-4768-9462-7aecbd88da35",
      "email": "__sim_d3e8u6_aa@sim.local",
      "profile": "lms-sim-d3e8u6-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "cec3e0a0-e0c1-4e3a-a8b8-ffaf56285c91",
      "email": "__sim_d3e8u6_ca@sim.local",
      "profile": "lms-sim-d3e8u6-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dedup Branch d3e8"
}
```