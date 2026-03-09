/**
 * Script to clean up duplicate parent entries
 * Run with: npx tsx scripts/cleanup-duplicate-parents.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateParents() {
  console.log("🔍 Finding duplicate parents...\n");

  // Find all parents with duplicate emails
  const { data: allParents, error: fetchError } = await supabase
    .from("parents")
    .select("id, name, email, phone, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Error fetching parents:", fetchError);
    return;
  }

  // Group by email
  const emailGroups = new Map<string, typeof allParents>();
  for (const parent of allParents || []) {
    const email = parent.email?.toLowerCase();
    if (!email) continue;

    if (!emailGroups.has(email)) {
      emailGroups.set(email, []);
    }
    emailGroups.get(email)!.push(parent);
  }

  // Find duplicates
  const duplicateGroups = Array.from(emailGroups.entries()).filter(
    ([_, parents]) => parents.length > 1
  );

  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicate parents found!");
    return;
  }

  console.log(`Found ${duplicateGroups.length} email(s) with duplicates:\n`);

  let totalDeleted = 0;

  for (const [email, parents] of duplicateGroups) {
    console.log(`📧 Email: ${email}`);
    console.log(`   Total entries: ${parents.length}`);

    // Keep the first one (oldest), delete the rest
    const [keepParent, ...duplicatesToDelete] = parents;
    console.log(`   Keeping: ${keepParent.name} (ID: ${keepParent.id}, created: ${keepParent.created_at})`);

    for (const duplicate of duplicatesToDelete) {
      console.log(`   Deleting: ${duplicate.name} (ID: ${duplicate.id}, created: ${duplicate.created_at})`);

      // First, update parent_students to point to the kept parent
      const { error: updateError } = await supabase
        .from("parent_students")
        .update({ parent_id: keepParent.id })
        .eq("parent_id", duplicate.id);

      if (updateError) {
        console.error(`   ⚠️ Error updating parent_students for ${duplicate.id}:`, updateError);
      }

      // Then soft-delete the duplicate parent
      const { error: deleteError } = await supabase
        .from("parents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", duplicate.id);

      if (deleteError) {
        console.error(`   ⚠️ Error deleting ${duplicate.id}:`, deleteError);
      } else {
        totalDeleted++;
      }
    }
    console.log("");
  }

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate parent(s).`);
}

cleanupDuplicateParents().catch(console.error);
