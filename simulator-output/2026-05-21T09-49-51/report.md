# Simulator report — scenario-import-dedup

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51
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
branch: "Sim Dedup Branch dgdx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/1-observer-ca.png`

### Step 2: `import_students_csv` as **sa**

```yaml
student: "Alex"
rows: [{"student_id":"","student_name":"Alex","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Dedup Parent","parent_email":"dedup.parent@sim.local","parent_phone":"0123450200","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_id":"","student_name":"Bella","date_of_birth":"2016-02-02","gender":"female","school_name":"Sim School","parent_name":"Dedup Parent2","parent_email":"dedup.parent2@sim.local","parent_phone":"0123450201","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""}]
branch: "Sim Dedup Branch dgdx"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/2-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/2-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-49-51/screenshots/2-observer-ca.png`

## Fixtures

```json
{
  "runId": "dgdxbu",
  "branchId": "1ee8ef63-e43c-404d-9c69-1bbdd92a6d7d",
  "branchName": "__sim_dgdxbu_Sim Dedup Branch",
  "courseId": "ae888941-56d7-40a3-b4a2-52778f1481d3",
  "courseName": "__sim_dgdxbu_DedupCourse",
  "packageId": "78251a38-eb63-4957-8484-9200eae06dbf",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "3905ae6a-677a-4a7a-8542-052953f6ce5b",
      "email": "__sim_dgdxbu_sa@sim.local",
      "profile": "lms-sim-dgdxbu-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "dbb79bc3-72c1-49cb-b957-ff06176784f4",
      "email": "__sim_dgdxbu_aa@sim.local",
      "profile": "lms-sim-dgdxbu-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "a253657a-d98d-4d22-8b2f-4de146c26e54",
      "email": "__sim_dgdxbu_ca@sim.local",
      "profile": "lms-sim-dgdxbu-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Dedup Branch dgdx"
}
```