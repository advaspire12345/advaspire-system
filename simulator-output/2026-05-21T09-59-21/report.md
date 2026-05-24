# Simulator report — scenario-import-pool

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-59-21
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
branch: "Sim Imp Branch j6ha"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-59-21/screenshots/1-actor-sa.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-59-21/screenshots/1-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-21T09-59-21/screenshots/1-observer-ca.png`

## Fixtures

```json
{
  "runId": "j6harz",
  "branchId": "8162ca92-bbf3-4fd2-984d-dce8f738691e",
  "branchName": "__sim_j6harz_Sim Imp Branch",
  "courseId": "260b8f87-93da-44e0-8790-0e842bc138be",
  "courseName": "__sim_j6harz_ImportCourse",
  "packageId": "51a6f654-5145-4f9b-b402-f4feff16bea9",
  "users": [
    {
      "handle": "sa",
      "role": "super_admin",
      "id": "f6549106-49c5-4700-bf4b-a0960d9c132b",
      "email": "__sim_j6harz_sa@sim.local",
      "profile": "lms-sim-j6harz-sa",
      "password": "simpass"
    },
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "f47d819a-849c-41fc-addc-d9e6dff8e12c",
      "email": "__sim_j6harz_aa@sim.local",
      "profile": "lms-sim-j6harz-aa",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "4f3ca07a-023b-4f60-929e-f13aa30ccadb",
      "email": "__sim_j6harz_ca@sim.local",
      "profile": "lms-sim-j6harz-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim Imp Branch j6ha"
}
```