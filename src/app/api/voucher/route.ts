import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import { getUserByEmail, isSuperAdmin } from "@/data/users";

/** Resolve the company id for the current user (NULL for super_admin). */
async function resolveCompanyId(email: string): Promise<string | null> {
  if (isSuperAdmin(email)) return null;
  const u = await getUserByEmail(email);
  if (!u?.branch_id) return null;
  const { data: b } = await supabaseAdmin
    .from("branches")
    .select("id, type, parent_id")
    .eq("id", u.branch_id)
    .maybeSingle();
  if (!b) return null;
  return b.type === "company" ? b.id : b.parent_id;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, discountType, discountValue, expiryType, expiryMonths, expiryDate } = await request.json();

  if (!code || !discountType || !discountValue || !expiryType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Stamp the creator's company on the voucher so it's only visible to that
  // company on /voucher and in the program-pricing voucher dropdown.
  const companyId = await resolveCompanyId(user.email);

  const { error } = await supabaseAdmin.from("vouchers").insert({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    expiry_type: expiryType,
    expiry_months: expiryType === "monthly" ? expiryMonths : null,
    expiry_date: expiryType === "date" ? expiryDate : null,
    company_id: companyId,
  });

  if (error) {
    console.error("Error creating voucher:", error);
    if (error.code === "23505") return NextResponse.json({ error: "Voucher code already exists" }, { status: 400 });
    return NextResponse.json({ error: "Failed to create voucher" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, code, discountType, discountValue, expiryType, expiryMonths, expiryDate } = await request.json();

  if (!id) return NextResponse.json({ error: "Missing voucher ID" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vouchers")
    .update({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      expiry_type: expiryType,
      expiry_months: expiryType === "monthly" ? expiryMonths : null,
      expiry_date: expiryType === "date" ? expiryDate : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating voucher:", error);
    if (error.code === "23505") return NextResponse.json({ error: "Voucher code already exists" }, { status: 400 });
    return NextResponse.json({ error: "Failed to update voucher" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "Missing voucher ID" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vouchers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json({ error: "Failed to delete voucher" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
