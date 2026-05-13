"use client";

/**
 * VELIQA Client-Side Analytics
 * Tracks user interactions and sends them to /api/track
 */

// Session ID persisted in sessionStorage
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("veliqa_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("veliqa_sid", sid);
  }
  return sid;
}

function getDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

interface TrackEvent {
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  search_query?: string;
  metadata?: Record<string, unknown>;
}

// Batch events and send every 2 seconds (or on page unload)
let eventQueue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (eventQueue.length === 0) return;
  const events = [...eventQueue];
  eventQueue = [];

  const payload = {
    events: events.map((e) => ({
      ...e,
      page_url: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    })),
  };

  // Use sendBeacon for reliability (works on page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", JSON.stringify(payload));
  } else {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 2000);
}

// Setup unload listener once
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/**
 * Track an analytics event
 */
export function track(event: TrackEvent) {
  if (typeof window === "undefined") return;
  eventQueue.push(event);
  scheduleFlush();
}

// ── Convenience helpers ──

export function trackPageView(pageName?: string) {
  track({
    event_type: "page_view",
    entity_type: "page",
    entity_name: pageName,
  });
}

export function trackSearch(query: string, resultCount?: number) {
  track({
    event_type: "search",
    search_query: query,
    metadata: { result_count: resultCount },
  });
}

export function trackBoatClick(boatId: string, boatName: string, source?: string) {
  track({
    event_type: "boat_click",
    entity_type: "boat",
    entity_id: boatId,
    entity_name: boatName,
    metadata: { source },
  });
}

export function trackCompanyClick(companyId: string, companyName: string) {
  track({
    event_type: "company_click",
    entity_type: "company",
    entity_id: companyId,
    entity_name: companyName,
  });
}

export function trackCharterClick(slug: string, name: string, source?: string) {
  track({
    event_type: "charter_click",
    entity_type: "charter",
    entity_id: slug,
    entity_name: name,
    metadata: { source },
  });
}

export function trackContactClick(companySlug: string, companyName: string, method: string) {
  track({
    event_type: "contact_click",
    entity_type: "company",
    entity_id: companySlug,
    entity_name: companyName,
    metadata: { method }, // "email", "phone", "whatsapp", "website"
  });
}

export function trackDestinationClick(destination: string) {
  track({
    event_type: "destination_click",
    entity_type: "destination",
    entity_id: destination,
    entity_name: destination,
  });
}

export function trackFilterUse(filterType: string, filterValue: string) {
  track({
    event_type: "filter_use",
    entity_type: "filter",
    entity_id: filterType,
    entity_name: filterValue,
  });
}

export function trackOutboundLink(url: string, companyName?: string) {
  track({
    event_type: "outbound_link",
    entity_type: "link",
    entity_id: url,
    entity_name: companyName,
  });
}
