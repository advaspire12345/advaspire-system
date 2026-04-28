import { supabaseAdmin } from "@/db";
import { RegistrationForm } from "@/components/registration/registration-form";

interface Props {
  params: Promise<{ branchCode: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { branchCode } = await params;

  // Find branch by code
  const { data: branch, error } = await supabaseAdmin
    .from("branches")
    .select("id, name, city, code, type, parent_id")
    .eq("code", branchCode)
    .is("deleted_at", null)
    .single();

  if (error || !branch || branch.type === "company") {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Registration Link</h1>
        <p className="text-muted-foreground">
          This registration link is not valid. Please contact your branch for a correct link.
        </p>
      </main>
    );
  }

  // Get company name
  let companyName = "";
  if (branch.parent_id) {
    const { data: company } = await supabaseAdmin
      .from("branches")
      .select("name")
      .eq("id", branch.parent_id)
      .single();
    companyName = company?.name ?? "";
  }

  // Fetch courses that have slots in this branch
  const { data: slots } = await supabaseAdmin
    .from("course_slots")
    .select(`
      id,
      course_id,
      day,
      time,
      duration,
      limit_student,
      course:courses!inner(id, name)
    `)
    .eq("branch_id", branch.id)
    .is("deleted_at", null)
    .order("day")
    .order("time");

  // Build unique courses and their slots
  const courseMap = new Map<string, { id: string; name: string }>();
  const courseSlots: { id: string; courseId: string; day: string; time: string; duration: number }[] = [];

  for (const slot of slots ?? []) {
    const course = slot.course as unknown as { id: string; name: string };
    if (course) {
      courseMap.set(course.id, { id: course.id, name: course.name });
      courseSlots.push({
        id: slot.id,
        courseId: course.id,
        day: slot.day,
        time: slot.time,
        duration: slot.duration,
      });
    }
  }

  const courses = Array.from(courseMap.values());

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Branch Info Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Student Registration</h1>
        <p className="text-muted-foreground mt-1">
          {branch.name}{branch.city ? ` — ${branch.city}` : ""}
        </p>
        {companyName && (
          <p className="text-sm text-muted-foreground">{companyName}</p>
        )}
      </div>

      <RegistrationForm
        branchId={branch.id}
        branchName={branch.name}
        courses={courses}
        courseSlots={courseSlots}
        layout="desktop"
      />
    </main>
  );
}
