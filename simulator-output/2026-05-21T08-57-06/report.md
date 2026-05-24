# Simulator report — scenario-import-dedup

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06
**Steps:** 2
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |
| 2 | assistant_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 2 | assistant_admin | `attendance.count` | — | 0 | 0 | ✅ |
| 2 | company_admin | `/student.row_visible(Alex)` | true | — | true | ✅ |
| 2 | company_admin | `enrollment.sessions_remaining` | — | 0 | 0 | ✅ |
| 2 | company_admin | `attendance.count` | — | 0 | 0 | ✅ |

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch udzw"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch udzw"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/2-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T08-57-06/screenshots/2-observer-ca.png`

## Fixtures

```json
{
  "runId": "udzwh8",
  "branchId": "705dcd32-50c6-4c0c-b57a-30d63edc47dc",
  "branchName": "__sim_udzwh8_Sim Dedup Branch",
  "courseId": "b1f23757-7418-4397-bbc0-7e53f2e59c89",
  "courseName": "__sim_udzwh8_DedupCourse",
  "packageId": "adc36973-595c-4bcb-a516-0a547c3a2afd",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "ac5d65e2-8d8b-4746-bbc5-3abfe9797017",
      "email": "__sim_udzwh8_sa@sim.local",
      "profile": "lms-sim-udzwh8-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "cfaf3d9b-cb49-4011-8f71-dab2a8f64af7",
      "email": "__sim_udzwh8_aa@sim.local",
      "profile": "lms-sim-udzwh8-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "98e0260e-aa4c-4635-a90f-88aad76bafc0",
      "email": "__sim_udzwh8_ca@sim.local",
      "profile": "lms-sim-udzwh8-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dedup Branch udzw"
}
```