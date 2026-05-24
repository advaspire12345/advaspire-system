# Simulator report — scenario-7-restoration-after-expiry

**Run dir:** /Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44
**Steps:** 8
**Drift findings:** 2

## ❌ Drift / failure findings

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 8 | assistant_admin | `enrollment.sessions_remaining` | — | 0 | 4 | ❌ DB_FAIL |
| 8 | instructor | `enrollment.sessions_remaining` | — | 0 | 4 | ❌ DB_FAIL |

## Full checkpoint table

| Step | Role | Field | DOM | DB | Expected | Result |
|------|------|-------|-----|-----|----------|--------|
| 1 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 1 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 2 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 2 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 3 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 3 | instructor | `/attendance.row_visible(Ali7)` | true | — | true | ✅ |
| 4 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 4 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 5 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 5 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 6 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 6 | instructor | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 6 | company_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 6 | company_admin | `pending_payments_table.row_visible` | — | true | true | ✅ |
| 7 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 7 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 8 | assistant_admin | `/student.row_visible(Ali7)` | true | — | true | ✅ |
| 8 | assistant_admin | `enrollment.sessions_remaining` | — | 0 | 4 | ❌ DB_FAIL |
| 8 | instructor | `/attendance.row_visible(Ali7)` | false | — | false | ✅ |
| 8 | instructor | `enrollment.sessions_remaining` | — | 0 | 4 | ❌ DB_FAIL |

## Per-step breakdown

### Step 1: `add_student` as **aa**

```yaml
name: "Ali7"
parent_name: "S7 Parent"
parent_email: "p7@sim.local"
parent_phone: "0123450070"
course: "__sim_hnjkgw_Course7"
package: "4-session"
date_of_birth: "2015-01-01"
gender: "male"
school_name: "Sim School"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/1-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/1-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/1-observer-ca.png`

### Step 2: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/2-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/2-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/2-observer-inst.png`

### Step 3: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/3-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/3-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/3-observer-inst.png`

### Step 4: `mark_present` as **inst**

```yaml
student: "Ali7"
lesson: "Lesson 1"
mission: "Level 1"
activity: "intro"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/4-actor-inst.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/4-observer-aa.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/4-observer-ca.png`

### Step 5: `expire_enrollment` as **aa**

```yaml
student: "Ali7"
days_ago: 1
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/5-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/5-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/5-observer-ca.png`

### Step 6: `add_payment_for_student` as **aa**

```yaml
student: "Ali7"
course: "__sim_hnjkgw_Course7"
package: "4 Sessions"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/6-actor-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/6-observer-inst.png`
- observer (company_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/6-observer-ca.png`

### Step 7: `mark_offline_paid` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/7-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/7-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/7-observer-inst.png`

### Step 8: `approve_pending_payment` as **ca**

```yaml
student: "Ali7"
branch: "Sim S7 Branch hnjk"
```
- actor screenshot: `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/8-actor-ca.png`
- observer (assistant_admin): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/8-observer-aa.png`
- observer (instructor): `/Users/angy/Documents/GitHub/claude-test/adcoinSystem/simulator-output/2026-05-15T10-31-44/screenshots/8-observer-inst.png`

## Fixtures

```json
{
  "runId": "hnjkgw",
  "branchId": "15e25c14-7ef7-4800-86f0-c28dc904db99",
  "branchName": "__sim_hnjkgw_Sim S7 Branch",
  "courseId": "849af476-1f96-4ed5-bdfa-0a14ecbce61c",
  "courseName": "__sim_hnjkgw_Course7",
  "packageId": "1cb4c5ed-8548-4e0e-90d2-c805e6bfbead",
  "users": [
    {
      "handle": "aa",
      "role": "assistant_admin",
      "id": "fee6cc3d-0199-41ea-9764-18bd838b2d59",
      "email": "__sim_hnjkgw_aa@sim.local",
      "profile": "lms-sim-hnjkgw-aa",
      "password": "simpass"
    },
    {
      "handle": "inst",
      "role": "instructor",
      "id": "d31dd083-d5f5-4d12-a8ec-95ceb75b66fb",
      "email": "__sim_hnjkgw_inst@sim.local",
      "profile": "lms-sim-hnjkgw-inst",
      "password": "simpass"
    },
    {
      "handle": "ca",
      "role": "company_admin",
      "id": "53b79b5a-a2ad-47da-9eb0-c2e80ff497d1",
      "email": "__sim_hnjkgw_ca@sim.local",
      "profile": "lms-sim-hnjkgw-ca",
      "password": "simpass"
    }
  ],
  "createdVoucherCodes": [],
  "branchCity": "Sim S7 Branch hnjk"
}
```