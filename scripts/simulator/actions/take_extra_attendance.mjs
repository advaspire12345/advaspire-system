// Action: take_extra_attendance
//
// Drives the "Take Attendance" (add-mode) modal on /attendance to record an
// attendance entry at a non-default day/time — i.e. an EXTRA attendance for
// a student on the same day as their scheduled slot, or on any other day.
//
// Used by Scenario 16 (Multiple Attendance Slots on Same Day) where the
// admin records 2+ sessions for the same student on the same date but at
// different times. The system's duplicate prevention only blocks same
// day+SAME time; different times are allowed.
//
// UI flow:
//   /attendance → "Take Attendance" button (top-right of page, NOT the
//   per-row "Mark X as present" button used by mark_present).
//   Modal → Student (searchable), Program (filters to student's enrollments),
//   Day (dropdown), Time (HH:MM input), Lesson, Mission, Activity Completed,
//   then "Save & Mark Present".
//
// Note: passing the same day+time twice should produce a duplicate-error
// banner in the modal — the action does NOT click submit when the duplicate
// guard fires; instead it returns the error text via a captured eval so the
// scenario can assert on it. (Phase 1 of this action: no duplicate check —
// caller is responsible for picking distinct times. Scenario 16 just covers
// the happy path; the negative case lives in a separate scenario.)

export default {
  id: "take_extra_attendance",
  description:
    "Open the Take Attendance modal in add mode and record an attendance at a specified day/time (for the multi-attendance-same-day flow).",
  fields: {
    student: { type: "string", required: true, example: "Ali" },
    course: { type: "string", required: true, example: "Course16", desc: "Program / course name to pick from the Program dropdown" },
    day: { type: "string", required: true, example: "Monday", desc: "Day of week (matches the Day dropdown options)" },
    time: { type: "string", required: true, example: "15:00", desc: "Start time HH:MM (24-hour)" },
    lesson: { type: "string", required: true, example: "Lesson 1" },
    mission: { type: "string", required: true, example: "Level 1" },
    activity: { type: "string", required: true, example: "extra session" },
    class_type: { type: "enum:Physical,Online", required: false, default: "Physical" },
  },
  ui: async (browser, args) => {
    browser.open("/attendance");
    browser.sleep(500);

    // 1. Click the page-level Take Attendance button (NOT the per-row button).
    browser.clickButton("Take Attendance");
    browser.sleep(900);

    // 2. Student dropdown — searchable.
    browser.selectByLabel("Student", args.student);
    browser.sleep(500);

    // 3. Program filtered by student's enrollments.
    browser.selectByLabel("Program", args.course);
    browser.sleep(400);

    // 4. Type (Physical/Online).
    if (args.class_type) {
      browser.selectByLabel("Type", args.class_type);
      browser.sleep(200);
    }

    // 5. Day dropdown.
    browser.selectByLabel("Day", args.day);
    browser.sleep(200);

    // 6. Time input. Native <input type="time"> with id="start-time".
    //    fillCss is the simulator helper for direct CSS selectors — same
    //    pattern as add_student's date input.
    browser.fillCss("input#start-time", args.time);
    browser.sleep(300);

    // 7. Lesson / Mission / Activity.
    browser.selectByLabel("Lesson", args.lesson);
    browser.sleep(200);
    browser.selectByLabel("Mission", args.mission);
    browser.sleep(200);
    browser.fillLabel("Activity Completed", args.activity);

    // 8. Submit.
    browser.clickDialogButton("Save & Mark Present");
    browser.sleep(1200);
    browser.ab(`wait --load networkidle`);
  },
};
