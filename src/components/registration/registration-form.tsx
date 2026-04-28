"use client";

import { useState } from "react";
import { Plus, Minus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  name: string;
}

interface CourseSlot {
  id: string;
  courseId: string;
  day: string;
  time: string;
  duration: number;
}

interface ProgramSlotEntry {
  tempId: string;
  courseId: string;
  slotId: string;
}

interface StudentEntry {
  tempId: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  schoolName: string;
  programSlots: ProgramSlotEntry[];
}

interface RegistrationFormProps {
  branchId: string;
  branchName: string;
  courses: Course[];
  courseSlots: CourseSlot[];
  layout?: "desktop" | "default";
  noCard?: boolean;
  onSuccess?: () => void;
}

let tempIdCounter = 0;
function genId() { return `s-${++tempIdCounter}`; }

function formatTime(time: string): string {
  const parts = time.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}

function formatEndTime(start: string, duration: number): string {
  const parts = start.split(":");
  if (parts.length < 2) return "";
  const mins = parseInt(parts[0]) * 60 + parseInt(parts[1]) + duration;
  return `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function RegistrationForm({
  branchId,
  branchName,
  courses,
  courseSlots,
  layout = "default",
  noCard,
  onSuccess,
}: RegistrationFormProps) {
  const isDesktop = layout === "desktop";
  const Wrap = noCard ? "div" : Card;
  const WrapContent = noCard ? "div" : CardContent;
  // Parent fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentPostcode, setParentPostcode] = useState("");
  const [parentCity, setParentCity] = useState("");

  // Students
  const [students, setStudents] = useState<StudentEntry[]>([
    { tempId: genId(), name: "", dateOfBirth: "", gender: "", schoolName: "", programSlots: [{ tempId: genId(), courseId: "", slotId: "" }] },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addStudent = () => {
    setStudents((prev) => [
      ...prev,
      { tempId: genId(), name: "", dateOfBirth: "", gender: "", schoolName: "", programSlots: [{ tempId: genId(), courseId: "", slotId: "" }] },
    ]);
  };

  const removeStudent = (tempId: string) => {
    setStudents((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateStudent = (tempId: string, updates: Partial<StudentEntry>) => {
    setStudents((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
    );
  };

  const addProgramSlot = (studentTempId: string) => {
    setStudents((prev) =>
      prev.map((s) => s.tempId === studentTempId
        ? { ...s, programSlots: [...s.programSlots, { tempId: genId(), courseId: "", slotId: "" }] }
        : s
      )
    );
  };

  const removeProgramSlot = (studentTempId: string, psTempId: string) => {
    setStudents((prev) =>
      prev.map((s) => s.tempId === studentTempId
        ? { ...s, programSlots: s.programSlots.filter((ps) => ps.tempId !== psTempId) }
        : s
      )
    );
  };

  const updateProgramSlot = (studentTempId: string, psTempId: string, updates: Partial<ProgramSlotEntry>) => {
    setStudents((prev) =>
      prev.map((s) => s.tempId === studentTempId
        ? { ...s, programSlots: s.programSlots.map((ps) => ps.tempId === psTempId ? { ...ps, ...updates } : ps) }
        : s
      )
    );
  };

  const getSlotOptions = (courseId: string) => {
    return courseSlots
      .filter((s) => s.courseId === courseId)
      .map((s) => ({
        value: s.id,
        label: `${capitalize(s.day)} ${formatTime(s.time)} - ${formatEndTime(s.time, s.duration)}`,
      }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!parentName.trim()) { setError("Parent name is required"); return; }
    if (!parentEmail.trim()) { setError("Parent email is required"); return; }
    if (!parentPhone.trim()) { setError("Parent phone is required"); return; }

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s.name.trim()) { setError(`Student ${i + 1}: Name is required`); return; }
      if (!s.dateOfBirth) { setError(`Student ${i + 1}: Date of birth is required`); return; }
      if (!s.gender) { setError(`Student ${i + 1}: Gender is required`); return; }
      for (let j = 0; j < s.programSlots.length; j++) {
        const ps = s.programSlots[j];
        if (!ps.courseId) { setError(`Student ${i + 1}, Program ${j + 1}: Please select a program`); return; }
        if (!ps.slotId) { setError(`Student ${i + 1}, Program ${j + 1}: Please select a time slot`); return; }
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          parent: {
            name: parentName.trim(),
            email: parentEmail.trim().toLowerCase(),
            phone: parentPhone.trim(),
            address: parentAddress.trim() || null,
            postcode: parentPostcode.trim() || null,
            city: parentCity.trim() || null,
          },
          students: students.map((s) => ({
            name: s.name.trim(),
            dateOfBirth: s.dateOfBirth,
            gender: s.gender,
            schoolName: s.schoolName.trim() || null,
            programSlots: s.programSlots.map((ps) => ({
              courseId: ps.courseId,
              slotId: ps.slotId,
            })),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Wrap className={noCard ? "" : "bg-white border-none shadow-sm"}>
        <WrapContent className={noCard ? "py-16 text-center" : "py-16 text-center"}>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Registration Successful!</h2>
          <p className="text-muted-foreground">
            Thank you for registering. Our team will review and contact you soon.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            A confirmation will be sent to <span className="font-semibold">{parentEmail}</span>
          </p>
        </WrapContent>
      </Wrap>
    );
  }

  // Student section (shared between layouts)
  const studentSection = (
    <div className="space-y-6">
      <h2 className={cn("font-bold text-foreground", isDesktop ? "text-base" : "text-lg")}>Student Information</h2>
      {students.map((student, index) => {
        const age = calculateAge(student.dateOfBirth);
        return renderStudentCard(student, index, age);
      })}

      <button
        type="button"
        onClick={addStudent}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#23D2E2] text-[#23D2E2] font-bold text-sm hover:bg-[#23D2E2]/5 transition"
      >
        <Plus size={16} strokeWidth={3} />
        Add Another Student
      </button>
    </div>
  );

  function renderStudentCard(student: StudentEntry, index: number, age: number | null) {
    return (
      <Wrap key={student.tempId} className={noCard ? "" : "bg-white border-none shadow-sm"}>
        <WrapContent className={noCard ? "space-y-5" : "p-6 space-y-5"}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {students.length > 1 ? `Student #${index + 1}` : ""}
            </h3>
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeStudent(student.tempId)}
                className="p-1 rounded-full border-2 border-[#fd434f] hover:bg-red-500/10 transition flex items-center justify-center"
                title="Remove student"
              >
                <Minus size={14} className="text-[#fd434f]" strokeWidth={4} />
              </button>
            )}
          </div>

          <FloatingInput
            id={`student-name-${student.tempId}`}
            label="Student Full Name *"
            value={student.name}
            onChange={(e) => updateStudent(student.tempId, { name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FloatingInput
              id={`student-dob-${student.tempId}`}
              label="Date of Birth *"
              type="date"
              value={student.dateOfBirth}
              onChange={(e) => updateStudent(student.tempId, { dateOfBirth: e.target.value })}
            />
            <FloatingInput
              id={`student-age-${student.tempId}`}
              label="Age"
              value={age !== null ? `${age} years old` : "-"}
              disabled
            />
            <FloatingSelect
              id={`student-gender-${student.tempId}`}
              label="Gender *"
              placeholder="Select gender"
              value={student.gender}
              onChange={(val) => updateStudent(student.tempId, { gender: val })}
              options={GENDER_OPTIONS}
            />
          </div>

          <FloatingInput
            id={`student-school-${student.tempId}`}
            label="School Name"
            value={student.schoolName}
            onChange={(e) => updateStudent(student.tempId, { schoolName: e.target.value })}
          />

          {/* Program + Time Slot entries */}
          {student.programSlots.map((ps, psIdx) => {
            const slotOptions = getSlotOptions(ps.courseId);
            return (
              <div key={ps.tempId} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FloatingSelect
                    id={`student-course-${student.tempId}-${ps.tempId}`}
                    label="Program *"
                    placeholder="Select program"
                    value={ps.courseId}
                    onChange={(val) => updateProgramSlot(student.tempId, ps.tempId, { courseId: val, slotId: "" })}
                    options={courses.map((c) => ({ value: c.id, label: c.name }))}
                  />
                  <FloatingSelect
                    id={`student-slot-${student.tempId}-${ps.tempId}`}
                    label="Preferred Time Slot *"
                    placeholder="Select time"
                    value={ps.slotId}
                    onChange={(val) => updateProgramSlot(student.tempId, ps.tempId, { slotId: val })}
                    options={slotOptions}
                    disabled={!ps.courseId}
                  />
                </div>
                {psIdx === 0 ? (
                  <button
                    type="button"
                    onClick={() => addProgramSlot(student.tempId)}
                    className="shrink-0 p-1 rounded-full border-2 border-[#23D2E2] transition hover:bg-[#23D2E2]/10"
                    title="Add program"
                  >
                    <Plus size={12} className="text-[#23D2E2]" strokeWidth={5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeProgramSlot(student.tempId, ps.tempId)}
                    className="shrink-0 p-1 rounded-full border-2 border-[#fd434f] transition hover:bg-red-500/10"
                    title="Remove program"
                  >
                    <Minus size={12} className="text-[#fd434f]" strokeWidth={5} />
                  </button>
                )}
              </div>
            );
          })}
        </WrapContent>
      </Wrap>
    );
  }

  // Parent section (shared between layouts)
  const parentSection = (
    <Wrap className={noCard ? "" : "bg-white border-none shadow-sm"}>
      <WrapContent className={noCard ? "space-y-5" : "p-6 space-y-5"}>
        <h2 className={cn("font-bold text-foreground", isDesktop ? "text-base" : "text-lg")}>Parent / Guardian</h2>

        <FloatingInput
          id="parent-name"
          label="Full Name *"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
        />
        <FloatingInput
          id="parent-phone"
          label="Phone Number *"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
        />
        <FloatingInput
          id="parent-email"
          label="Email Address *"
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
        />
        <FloatingInput
          id="parent-address"
          label="Address"
          value={parentAddress}
          onChange={(e) => setParentAddress(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <FloatingInput
            id="parent-postcode"
            label="Postcode"
            value={parentPostcode}
            onChange={(e) => setParentPostcode(e.target.value)}
          />
          <FloatingInput
            id="parent-city"
            label="City"
            value={parentCity}
            onChange={(e) => setParentCity(e.target.value)}
          />
        </div>
      </WrapContent>
    </Wrap>
  );

  if (isDesktop) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-6">
          {/* Parent — left (2 cols) */}
          <div className="col-span-2">
            <div className="sticky top-4">
              {parentSection}
            </div>
          </div>

          {/* Students — right (3 cols) */}
          <div className="col-span-3">
            {studentSection}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-[54px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] text-lg"
        >
          {isSubmitting ? "Submitting..." : "Submit Registration"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {parentSection}
      {studentSection}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full h-[54px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] text-lg"
      >
        {isSubmitting ? "Submitting..." : "Submit Registration"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By submitting, you agree to our terms and conditions.
      </p>
    </div>
  );
}
