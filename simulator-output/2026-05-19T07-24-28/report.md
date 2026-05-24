# Simulator report — scenario-import-dedup

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28
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
branch: "Sim Dedup Branch 1lsw"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch 1lsw"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/2-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-19T07-24-28/screenshots/2-observer-ca.png`

## Fixtures

```json
{
  "runId": "1lswlx",
  "branchId": "a217925d-f60a-438b-8c23-ff14223f1951",
  "branchName": "__sim_1lswlx_Sim Dedup Branch",
  "courseId": "ff6f5cd8-c3fd-45ed-9c5d-5d9c704eacab",
  "courseName": "__sim_1lswlx_DedupCourse",
  "packageId": "f5329849-6d36-45b9-8a74-8cb779ffe115",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "bf200e78-4728-4f15-9e6e-95bca08f0a96",
      "email": "__sim_1lswlx_sa@sim.local",
      "profile": "lms-sim-1lswlx-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "15b69ee4-2350-4007-93c3-216c936da290",
      "email": "__sim_1lswlx_aa@sim.local",
      "profile": "lms-sim-1lswlx-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "7477c1d8-27d0-4f1d-8b46-ad8f1474e74e",
      "email": "__sim_1lswlx_ca@sim.local",
      "profile": "lms-sim-1lswlx-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dedup Branch 1lsw"
}
```