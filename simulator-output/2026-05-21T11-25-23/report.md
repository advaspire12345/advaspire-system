# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-25-23
**Steps:** 1
**Drift findings:** 0

✅ All checkpoints passed.

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | assistant_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | assistant_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | assistant_admin | `enrollment.pool_id_set` | — | true | true | ✅ |
| 1 | company_admin | `/student.row_visible(AbuImp)` | true | — | true | ✅ |
| 1 | company_admin | `pool.active_students` | — | 2 | 2 | ✅ |
| 1 | company_admin | `enrollment.pool_id_set` | — | true | true | ✅ |

## Per-step breakdown

### Step 1: `import_students_csv` as **sa**

```yaml
student: "AbuImp"
rows: [{"student_name":"AliImp","date_of_birth":"2015-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":""},{"student_name":"AbuImp","date_of_birth":"2017-01-01","gender":"male","school_name":"Sim School","parent_name":"Imp Parent","parent_email":"imp.parent@sim.local","parent_phone":"0123450001","package_type":"session","package_duration":"4","schedule_day":"monday","schedule_time":"10:00","enrollment_status":"active","sessions_remaining":"0","share_with_sibling":"true"}]
branch: "Sim Imp Branch yu6i"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-25-23/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-25-23/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T11-25-23/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "yu6iq7",
  "branchId": "b52ac8b5-d7ef-4da1-9250-848855be846d",
  "branchName": "__sim_yu6iq7_Sim Imp Branch",
  "courseId": "0b58819f-b604-4ddd-bca9-448c695594c4",
  "courseName": "__sim_yu6iq7_ImportCourse",
  "packageId": "493897f3-708e-4b2e-8bcc-a3b7fb0f104f",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "9f71ef8b-4144-4e8d-b6b2-fcef7620a70e",
      "email": "__sim_yu6iq7_sa@sim.local",
      "profile": "lms-sim-yu6iq7-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "2e36857a-4455-42e9-a028-62a4aff59f1c",
      "email": "__sim_yu6iq7_aa@sim.local",
      "profile": "lms-sim-yu6iq7-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "74165b48-6822-414e-82c6-3feec6b7afa9",
      "email": "__sim_yu6iq7_ca@sim.local",
      "profile": "lms-sim-yu6iq7-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch yu6i"
}
```