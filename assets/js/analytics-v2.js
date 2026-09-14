"use strict";

// =========================================================
// AromaLParfum — PASO 61
// Analytics First‑Party V2
// - Solo tienda pública.
// - Sin cookies de terceros.
// - Sin PII: no captura nombre, email, teléfono, dirección ni texto libre.
// - Eventos en lote para reducir requests a Supabase.
// =========================================================

const ALP61_SESSION_KEY = "alp_analytics_visit_v2";
const ALP61_QUEUE_KEY = "alp_analytics_queue_v2";
const ALP61_ACQUISITION_KEY = "alp_analytics_acquisition_v2";
const ALP61_MAX_QUEUE = 20;
const ALP61_FLUSH_SIZE = 5;
const ALP61_FLUSH_DELAY = 12000;

const alp61AnalyticsState = {
  initialized: false,
  flushing: false,
  timer: null,
  queue: [],
  dedupe: new Map(),
};

window.alp61AnalyticsState = alp61AnalyticsState;

function analyticsV2IsPublicStore()
{
  return document.body?.dataset.entry !== "admin";
}

function analyticsV2RandomId()
{
  if (globalThis.crypto?.randomUUID)
  {
    return globalThis.crypto.randomUUID();
  }

  return `alp61-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function analyticsV2GetSessionId()
{
  if (!analyticsV2IsPublicStore()) return "";

  let value = "";

  try
  {
    value = sessionStorage.getItem(ALP61_SESSION_KEY) || "";
  }
  catch (_error)
  {
    value = "";
  }

  if (!value)
  {
    value = analyticsV2RandomId().slice(0, 100);

    try
    {
      sessionStorage.setItem(ALP61_SESSION_KEY, value);
    }
    catch (_error)
    {
      // Si sessionStorage no está disponible, la sesión sigue viva en memoria.
    }
  }

  return value;
}

function analyticsV2DeviceClass()
{
  const width = Number(globalThis.innerWidth || document.documentElement?.clientWidth || 0);
  if (width > 0 && width < 768) return "mobile";
  if (width >= 768 && width < 1100) return "tablet";
  return "desktop";
}

function analyticsV2ReferrerHost()
{
  try
  {
    if (!document.referrer) return "";
    const ref = new URL(document.referrer);
    if (ref.host === location.host) return "";
    return String(ref.host || "").slice(0, 200);
  }
  catch (_error)
  {
    return "";
  }
}

function analyticsV2CaptureAcquisition()
{
  let current = null;

  try
  {
    current = JSON.parse(sessionStorage.getItem(ALP61_ACQUISITION_KEY) || "null");
  }
  catch (_error)
  {
    current = null;
  }

  if (current && typeof current === "object") return current;

  const params = new URLSearchParams(location.search);
  const source = String(params.get("utm_source") || "").trim().slice(0, 120);
  const medium = String(params.get("utm_medium") || "").trim().slice(0, 120);
  const campaign = String(params.get("utm_campaign") || "").trim().slice(0, 120);
  const referrerHost = analyticsV2ReferrerHost();

  current = {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    referrer_host: referrerHost,
  };

  try
  {
    sessionStorage.setItem(ALP61_ACQUISITION_KEY, JSON.stringify(current));
  }
  catch (_error)
  {
    // Sin persistencia: se reutiliza mientras el módulo siga cargado.
  }

  return current;
}

function analyticsV2CampaignSlug()
{
  const params = new URLSearchParams(location.search);
  const fromQuery = String(params.get("campaign") || "").trim();
  let persisted = "";

  try
  {
    persisted = sessionStorage.getItem("alp_campaign_slug_v2") || "";
  }
  catch (_error)
  {
    persisted = "";
  }

  return String(
    state?.routePayload?.campaign_slug ||
    state?.routePayload?.campaignSlug ||
    (state?.route === "campaign" ? state?.routePayload?.slug : "") ||
    fromQuery ||
    persisted ||
    ""
  ).trim().toLowerCase().slice(0, 120);
}

function analyticsV2CartSnapshot()
{
  const lines = Array.isArray(state?.cart) ? state.cart : [];
  const quantity = lines.reduce((sum, line) => sum + Math.max(1, Number(line?.qty) || 1), 0);

  return {
    cart_lines: Math.min(999, lines.length),
    cart_quantity: Math.min(9999, quantity),
  };
}

function analyticsV2RouteKey(route = state?.route, payload = state?.routePayload)
{
  const safeRoute = String(route || "home").slice(0, 60);
  const safePayload = payload && typeof payload === "object" ? payload : {};

  if (safeRoute === "product") return `product:${Number(safePayload.id) || 0}`;
  if (safeRoute === "campaign") return `campaign:${String(safePayload.slug || safePayload.campaign_slug || "").slice(0, 120)}`;
  if (safeRoute === "collection") return `collection:${String(safePayload.slug || "").slice(0, 120)}`;
  return safeRoute;
}

function analyticsV2ReadQueue()
{
  try
  {
    const parsed = JSON.parse(sessionStorage.getItem(ALP61_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-ALP61_MAX_QUEUE) : [];
  }
  catch (_error)
  {
    return [];
  }
}

function analyticsV2PersistQueue()
{
  try
  {
    sessionStorage.setItem(ALP61_QUEUE_KEY, JSON.stringify(alp61AnalyticsState.queue.slice(-ALP61_MAX_QUEUE)));
  }
  catch (_error)
  {
    // La telemetría no debe romper la tienda si el storage está bloqueado.
  }
}

function analyticsV2ShouldDedupe(key, windowMs)
{
  const now = Date.now();
  const last = Number(alp61AnalyticsState.dedupe.get(key) || 0);

  if (last && now - last < windowMs) return true;

  alp61AnalyticsState.dedupe.set(key, now);

  if (alp61AnalyticsState.dedupe.size > 80)
  {
    const threshold = now - 60000;
    for (const [itemKey, timestamp] of alp61AnalyticsState.dedupe.entries())
    {
      if (timestamp < threshold) alp61AnalyticsState.dedupe.delete(itemKey);
    }
  }

  return false;
}

function analyticsV2ScheduleFlush()
{
  if (alp61AnalyticsState.timer) return;

  alp61AnalyticsState.timer = window.setTimeout(() =>
  {
    alp61AnalyticsState.timer = null;
    analyticsV2Flush();
  }, ALP61_FLUSH_DELAY);
}

function analyticsV2Enqueue(eventName, extra = {}, { dedupeKey = "", dedupeMs = 0 } = {})
{
  if (!analyticsV2IsPublicStore() || !alp61AnalyticsState.initialized) return;

  const allowed = new Set([
    "session_start",
    "page_view",
    "product_view",
    "add_to_cart",
    "checkout_start",
    "checkout_submit",
    "order_created",
  ]);

  if (!allowed.has(eventName)) return;

  if (dedupeKey && analyticsV2ShouldDedupe(`${eventName}:${dedupeKey}`, dedupeMs)) return;

  const acquisition = analyticsV2CaptureAcquisition();
  const cart = analyticsV2CartSnapshot();
  const productId = Number(extra.product_id || extra.productId || 0);

  const event = {
    event_name: eventName,
    session_id: analyticsV2GetSessionId(),
    route: String(extra.route || state?.route || "home").slice(0, 60),
    route_key: String(extra.route_key || analyticsV2RouteKey()).slice(0, 180),
    product_id: productId > 0 ? productId : null,
    campaign_slug: String(extra.campaign_slug || analyticsV2CampaignSlug() || "").slice(0, 120),
    utm_source: acquisition.utm_source || "",
    utm_medium: acquisition.utm_medium || "",
    utm_campaign: acquisition.utm_campaign || "",
    referrer_host: acquisition.referrer_host || "",
    device_class: analyticsV2DeviceClass(),
    cart_lines: cart.cart_lines,
    cart_quantity: cart.cart_quantity,
  };

  alp61AnalyticsState.queue.push(event);
  alp61AnalyticsState.queue = alp61AnalyticsState.queue.slice(-ALP61_MAX_QUEUE);
  analyticsV2PersistQueue();

  if (alp61AnalyticsState.queue.length >= ALP61_FLUSH_SIZE)
  {
    analyticsV2Flush();
  }
  else
  {
    analyticsV2ScheduleFlush();
  }
}

async function analyticsV2Flush()
{
  if (!analyticsV2IsPublicStore() || alp61AnalyticsState.flushing || !alp61AnalyticsState.queue.length) return;
  if (!globalThis.supabaseClient?.rpc) return;

  alp61AnalyticsState.flushing = true;
  const batch = alp61AnalyticsState.queue.splice(0, ALP61_MAX_QUEUE);
  analyticsV2PersistQueue();

  try
  {
    const result = await supabaseClient.rpc("track_store_events_v2", { p_events: batch });

    if (result.error)
    {
      throw result.error;
    }
  }
  catch (error)
  {
    console.debug("Analytics V2 flush deferred:", error?.message || error);
    alp61AnalyticsState.queue = [...batch, ...alp61AnalyticsState.queue].slice(-ALP61_MAX_QUEUE);
    analyticsV2PersistQueue();
  }
  finally
  {
    alp61AnalyticsState.flushing = false;

    if (alp61AnalyticsState.queue.length)
    {
      analyticsV2ScheduleFlush();
    }
  }
}

function analyticsV2TrackRoute(route = state?.route, payload = state?.routePayload)
{
  if (!alp61AnalyticsState.initialized) return;

  const key = analyticsV2RouteKey(route, payload);
  const productId = String(route) === "product" ? Number(payload?.id || 0) : 0;

  analyticsV2Enqueue(
    "page_view",
    { route, route_key: key, product_id: productId || null },
    { dedupeKey: key, dedupeMs: 2500 }
  );

  if (productId > 0)
  {
    analyticsV2Enqueue(
      "product_view",
      { route: "product", route_key: key, product_id: productId },
      { dedupeKey: String(productId), dedupeMs: 5000 }
    );
  }
}

function analyticsV2TrackCartAdd({ productId = null, kind = "product" } = {})
{
  analyticsV2Enqueue(
    "add_to_cart",
    {
      product_id: Number(productId) > 0 ? Number(productId) : null,
      route_key: `${analyticsV2RouteKey()}:cart:${String(kind || "product").slice(0, 50)}`,
    },
    { dedupeKey: `${productId || 0}:${kind}`, dedupeMs: 400 }
  );
}

function analyticsV2TrackCheckoutStart()
{
  analyticsV2Enqueue(
    "checkout_start",
    { route_key: analyticsV2RouteKey() },
    { dedupeKey: "checkout", dedupeMs: 2500 }
  );
}

function analyticsV2TrackCheckoutSubmit()
{
  analyticsV2Enqueue(
    "checkout_submit",
    { route_key: analyticsV2RouteKey() },
    { dedupeKey: "submit", dedupeMs: 2500 }
  );
}

function analyticsV2TrackOrderCreated()
{
  analyticsV2Enqueue(
    "order_created",
    { route_key: analyticsV2RouteKey() },
    { dedupeKey: "order", dedupeMs: 10000 }
  );
  analyticsV2Flush();
}

function analyticsV2Init()
{
  if (!analyticsV2IsPublicStore() || alp61AnalyticsState.initialized) return;

  alp61AnalyticsState.queue = analyticsV2ReadQueue();
  alp61AnalyticsState.initialized = true;
  analyticsV2CaptureAcquisition();

  analyticsV2Enqueue(
    "session_start",
    { route: state?.route || "home", route_key: analyticsV2RouteKey() },
    { dedupeKey: analyticsV2GetSessionId(), dedupeMs: 86400000 }
  );

  analyticsV2TrackRoute(state?.route || "home", state?.routePayload || {});

  document.addEventListener("visibilitychange", () =>
  {
    if (document.visibilityState === "hidden") analyticsV2Flush();
  });

  window.addEventListener("pagehide", () =>
  {
    analyticsV2Flush();
  });
}

window.analyticsV2GetSessionId = analyticsV2GetSessionId;
window.analyticsV2Init = analyticsV2Init;
window.analyticsV2TrackRoute = analyticsV2TrackRoute;
window.analyticsV2TrackCartAdd = analyticsV2TrackCartAdd;
window.analyticsV2TrackCheckoutStart = analyticsV2TrackCheckoutStart;
window.analyticsV2TrackCheckoutSubmit = analyticsV2TrackCheckoutSubmit;
window.analyticsV2TrackOrderCreated = analyticsV2TrackOrderCreated;
window.analyticsV2Flush = analyticsV2Flush;
