"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    ...profile,
    email: user.email,
    display_name:
      profile?.display_name || user.user_metadata?.full_name || "User",
  };
}

export async function getSavedBoats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("saved_boats")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getSearchHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("search_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}

export async function saveBoat(boatData: {
  boat_name: string;
  boat_data: object;
  source_url: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("saved_boats").insert({
    user_id: user.id,
    boat_name: boatData.boat_name,
    boat_data: boatData.boat_data,
    source_url: boatData.source_url,
    notes: boatData.notes ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function unsaveBoat(sourceUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("saved_boats")
    .delete()
    .eq("user_id", user.id)
    .eq("source_url", sourceUrl);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const display_name = formData.get("display_name") as string;
  const preferred_currency = formData.get("preferred_currency") as string;
  const notification_email = formData.get("notification_email") as string;

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name,
      preferred_currency,
      notification_email,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function createAlert(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const alert_name = formData.get("alert_name") as string;
  const boat_type = formData.get("boat_type") as string;
  const location = formData.get("location") as string;
  const max_budget = formData.get("max_budget") as string;
  const keywords = formData.get("keywords") as string;

  const criteria = {
    boat_type: boat_type || undefined,
    location: location || undefined,
    max_budget: max_budget ? Number(max_budget) : undefined,
    keywords: keywords
      ? keywords.split(",").map((k) => k.trim())
      : undefined,
  };

  const { error } = await supabase.from("notification_alerts").insert({
    user_id: user.id,
    alert_name,
    criteria,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile/alerts");
  return { success: true };
}

export async function toggleAlert(alertId: string, active: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_alerts")
    .update({ is_active: active })
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile/alerts");
  return { success: true };
}

export async function deleteAlert(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile/alerts");
  return { success: true };
}

export async function getAlerts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("notification_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
