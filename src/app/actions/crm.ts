"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CrmStatus =
  | "interested"
  | "contacted"
  | "quoted"
  | "negotiating"
  | "booked"
  | "completed"
  | "cancelled";

export interface CrmEntry {
  id: string;
  user_id: string;
  boat_name: string;
  boat_data: Record<string, unknown> | null;
  source_url: string;
  image_url: string | null;
  status: CrmStatus;
  priority: "low" | "medium" | "high";
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  charter_start: string | null;
  charter_end: string | null;
  guests: number | null;
  quoted_price: number | null;
  final_price: number | null;
  currency: string;
  notes: string | null;
  next_action: string | null;
  reminder_date: string | null;
  reminder_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  entry_id: string;
  activity_type: "note" | "call" | "email" | "status_change" | "quote_received" | "meeting" | "reminder";
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function listCrmEntries(): Promise<CrmEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("crm_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (data as CrmEntry[]) ?? [];
}

export async function getCrmEntry(id: string): Promise<{ entry: CrmEntry | null; activities: CrmActivity[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { entry: null, activities: [] };

  const { data: entry } = await supabase
    .from("crm_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) return { entry: null, activities: [] };

  const { data: activities } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: false });

  return { entry: entry as CrmEntry, activities: (activities as CrmActivity[]) ?? [] };
}

export async function addToCrm(input: {
  boat_name: string;
  source_url: string;
  image_url?: string;
  boat_data?: Record<string, unknown>;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("crm_entries")
    .upsert(
      {
        user_id: user.id,
        boat_name: input.boat_name,
        source_url: input.source_url,
        image_url: input.image_url ?? null,
        boat_data: input.boat_data ?? null,
        notes: input.notes ?? null,
        status: "interested",
      },
      { onConflict: "user_id,source_url" }
    )
    .select()
    .single();

  if (error) return { error: error.message };

  // Log activity
  if (data) {
    await supabase.from("crm_activities").insert({
      entry_id: data.id,
      user_id: user.id,
      activity_type: "note",
      description: `Boot zu CRM hinzugefügt: ${input.boat_name}`,
    });
  }

  revalidatePath("/crm");
  return { success: true, id: data?.id };
}

export async function updateCrmEntry(
  id: string,
  patch: Partial<Omit<CrmEntry, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Detect status change for activity log
  let prevStatus: string | null = null;
  if (patch.status) {
    const { data: prev } = await supabase
      .from("crm_entries")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    prevStatus = prev?.status ?? null;
  }

  const { error } = await supabase
    .from("crm_entries")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (patch.status && prevStatus && prevStatus !== patch.status) {
    await supabase.from("crm_activities").insert({
      entry_id: id,
      user_id: user.id,
      activity_type: "status_change",
      description: `Status: ${prevStatus} → ${patch.status}`,
      metadata: { from: prevStatus, to: patch.status },
    });
  }

  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  return { success: true };
}

export async function deleteCrmEntry(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("crm_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/crm");
  return { success: true };
}

export async function addCrmActivity(
  entryId: string,
  activityType: CrmActivity["activity_type"],
  description: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("crm_activities").insert({
    entry_id: entryId,
    user_id: user.id,
    activity_type: activityType,
    description,
    metadata: metadata ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/crm/${entryId}`);
  return { success: true };
}

export async function getCrmStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("crm_entries")
    .select("status, quoted_price, final_price, currency, reminder_date, reminder_done")
    .eq("user_id", user.id);

  if (!data) return null;

  const byStatus: Record<string, number> = {};
  let totalQuoted = 0;
  let totalBooked = 0;
  let pendingReminders = 0;
  const now = new Date();

  for (const e of data) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    if (e.quoted_price && e.status !== "cancelled") totalQuoted += Number(e.quoted_price);
    if (e.final_price && (e.status === "booked" || e.status === "completed")) {
      totalBooked += Number(e.final_price);
    }
    if (e.reminder_date && !e.reminder_done && new Date(e.reminder_date) <= now) {
      pendingReminders++;
    }
  }

  return {
    total: data.length,
    byStatus,
    totalQuoted,
    totalBooked,
    pendingReminders,
  };
}
