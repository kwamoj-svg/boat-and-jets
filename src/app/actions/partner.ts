"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function registerPartner(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst eingeloggt sein, um dich als Partner zu registrieren." };
  }

  const companyName = formData.get("company_name") as string;
  const companyType = formData.get("company_type") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const website = formData.get("website") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const country = formData.get("country") as string;
  const taxId = formData.get("tax_id") as string;
  const description = formData.get("description") as string;

  if (!companyName || !companyType || !email) {
    return { error: "Bitte fülle alle Pflichtfelder aus." };
  }

  const { error } = await supabase.from("partners").insert({
    user_id: user.id,
    company_name: companyName,
    company_type: companyType,
    email,
    phone: phone || null,
    website: website || null,
    address: address || null,
    city: city || null,
    country: country || null,
    tax_id: taxId || null,
    description: description || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Du bist bereits als Partner registriert." };
    }
    return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
  }

  return { success: true };
}

export async function getPartnerProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPartnerBoats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) {
    return [];
  }

  const { data, error } = await supabase
    .from("partner_boats")
    .select("*")
    .eq("partner_id", partner.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function createPartnerBoat(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  if (!partner) {
    return { error: "Kein Partnerkonto gefunden." };
  }

  if (partner.status !== "approved") {
    return { error: "Dein Partnerkonto ist noch nicht freigegeben." };
  }

  const featuresRaw = formData.get("features") as string;
  const imagesRaw = formData.get("images") as string;
  const imagesJson = formData.get("images_json") as string;

  const features = featuresRaw
    ? featuresRaw.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  // Prefer JSON array from uploader; fall back to legacy newline-separated URLs
  let images: string[] = [];
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (Array.isArray(parsed)) images = parsed.filter((u) => typeof u === "string");
    } catch { /* ignore */ }
  }
  if (images.length === 0 && imagesRaw) {
    images = imagesRaw.split("\n").map((u) => u.trim()).filter(Boolean);
  }

  const yearVal = formData.get("year") as string;
  const lengthVal = formData.get("length_ft") as string;
  const cabinsVal = formData.get("cabins") as string;
  const guestsVal = formData.get("guests") as string;
  const crewVal = formData.get("crew") as string;
  const pricePerDayVal = formData.get("price_per_day") as string;
  const pricePerWeekVal = formData.get("price_per_week") as string;
  const salePriceVal = formData.get("sale_price") as string;

  const { error } = await supabase.from("partner_boats").insert({
    partner_id: partner.id,
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    brand: formData.get("brand") as string || null,
    model: formData.get("model") as string || null,
    year: yearVal ? parseInt(yearVal, 10) : null,
    length_ft: lengthVal ? parseFloat(lengthVal) : null,
    cabins: cabinsVal ? parseInt(cabinsVal, 10) : null,
    guests: guestsVal ? parseInt(guestsVal, 10) : null,
    crew: crewVal ? parseInt(crewVal, 10) : null,
    price_per_day: pricePerDayVal ? parseFloat(pricePerDayVal) : null,
    price_per_week: pricePerWeekVal ? parseFloat(pricePerWeekVal) : null,
    sale_price: salePriceVal ? parseFloat(salePriceVal) : null,
    currency: (formData.get("currency") as string) || "EUR",
    region: formData.get("region") as string || null,
    country: formData.get("country") as string || null,
    port: formData.get("port") as string || null,
    description: formData.get("description") as string || null,
    features,
    images,
    contact_phone: formData.get("contact_phone") as string || null,
    contact_email: formData.get("contact_email") as string || null,
    status: (formData.get("status") as string) || "draft",
  });

  if (error) {
    return { error: "Boot konnte nicht erstellt werden. Bitte versuche es erneut." };
  }

  redirect("/partner/boats");
}

export async function updatePartnerBoat(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) {
    return { error: "Kein Partnerkonto gefunden." };
  }

  const featuresRaw = formData.get("features") as string;
  const imagesRaw = formData.get("images") as string;
  const imagesJson = formData.get("images_json") as string;

  const features = featuresRaw
    ? featuresRaw.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  // Prefer JSON array from uploader; fall back to legacy newline-separated URLs
  let images: string[] = [];
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (Array.isArray(parsed)) images = parsed.filter((u) => typeof u === "string");
    } catch { /* ignore */ }
  }
  if (images.length === 0 && imagesRaw) {
    images = imagesRaw.split("\n").map((u) => u.trim()).filter(Boolean);
  }

  const yearVal = formData.get("year") as string;
  const lengthVal = formData.get("length_ft") as string;
  const cabinsVal = formData.get("cabins") as string;
  const guestsVal = formData.get("guests") as string;
  const crewVal = formData.get("crew") as string;
  const pricePerDayVal = formData.get("price_per_day") as string;
  const pricePerWeekVal = formData.get("price_per_week") as string;
  const salePriceVal = formData.get("sale_price") as string;

  const { error } = await supabase
    .from("partner_boats")
    .update({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      brand: formData.get("brand") as string || null,
      model: formData.get("model") as string || null,
      year: yearVal ? parseInt(yearVal, 10) : null,
      length_ft: lengthVal ? parseFloat(lengthVal) : null,
      cabins: cabinsVal ? parseInt(cabinsVal, 10) : null,
      guests: guestsVal ? parseInt(guestsVal, 10) : null,
      crew: crewVal ? parseInt(crewVal, 10) : null,
      price_per_day: pricePerDayVal ? parseFloat(pricePerDayVal) : null,
      price_per_week: pricePerWeekVal ? parseFloat(pricePerWeekVal) : null,
      sale_price: salePriceVal ? parseFloat(salePriceVal) : null,
      currency: (formData.get("currency") as string) || "EUR",
      region: formData.get("region") as string || null,
      country: formData.get("country") as string || null,
      port: formData.get("port") as string || null,
      description: formData.get("description") as string || null,
      features,
      images,
      contact_phone: formData.get("contact_phone") as string || null,
      contact_email: formData.get("contact_email") as string || null,
      status: (formData.get("status") as string) || "draft",
    })
    .eq("id", id)
    .eq("partner_id", partner.id);

  if (error) {
    return { error: "Aktualisierung fehlgeschlagen." };
  }

  redirect("/partner/boats");
}

export async function deletePartnerBoat(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) {
    return { error: "Kein Partnerkonto gefunden." };
  }

  const { error } = await supabase
    .from("partner_boats")
    .update({ status: "inactive" })
    .eq("id", id)
    .eq("partner_id", partner.id);

  if (error) {
    return { error: "Löschen fehlgeschlagen." };
  }

  return { success: true };
}
