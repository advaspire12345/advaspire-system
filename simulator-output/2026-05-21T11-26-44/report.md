# Simulator report — scenario-import-dedup

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44
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
branch: "Sim Dedup Branch qszo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch qszo"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/2-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-26-44/screenshots/2-observer-ca.png`

## Fixtures

```json
{
  "runId": "qszoop",
  "branchId": "a3c11708-caa4-4b7f-ae49-22dfc0ae8f04",
  "branchName": "__sim_qszoop_Sim Dedup Branch",
  "courseId": "e74263d4-91e7-48d9-b053-591e2976ce24",
  "courseName": "__sim_qszoop_DedupCourse",
  "packageId": "2339424d-a3ce-4f9f-9aca-3fced32f42cc",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "12a2d77f-9450-4f10-8bd6-9f23307f5a8a",
      "email": "__sim_qszoop_sa@sim.local",
      "profile": "lms-sim-qszoop-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "0b644176-b4c0-4686-9406-76663fac2cdf",
      "email": "__sim_qszoop_aa@sim.local",
      "profile": "lms-sim-qszoop-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "b4752131-d727-47d6-b614-a887679db73f",
      "email": "__sim_qszoop_ca@sim.local",
      "profile": "lms-sim-qszoop-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dedup Branch qszo"
}
```