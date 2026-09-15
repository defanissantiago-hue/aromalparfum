"use strict";

// AromaLParfum Frontend V2 — Paso 66
// Resilience & Diagnostics V2: fallos recuperables, estado de red y diagnóstico
// local sin enviar PII ni telemetría adicional a Supabase.

const ALP66_BUILD = "66";
const ALP66_DIAGNOSTICS_KEY = "alp66_diagnostics_v2";
const ALP66_MAX_DIAGNOSTICS = 12;
const alp66DiagnosticsMemory = [];
let alp66NetworkTimer = null;

function alp66SessionGet(key, fallback = null)
{
  try
  {
    const value = window.sessionStorage.getItem(String(key || ""));
    return value === null ? fallback : value;
  }
  catch (_)
  {
    return fallback;
  }
}

function alp66SessionSet(key, value)
{
  try
  {
    window.sessionStorage.setItem(String(key || ""), String(value ?? ""));
    return true;
  }
  catch (_)
  {
    return false;
  }
}

function alp66SessionRemove(key)
{
  try
  {
    window.sessionStorage.removeItem(String(key || ""));
    return true;
  }
  catch (_)
  {
    return false;
  }
}

function alp66ErrorCategory(error)
{
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  const combined = `${name} ${message}`;

  if (/failed to fetch|network|load failed|timeout|offline|connection|net::/.test(combined))
  {
    return "network";
  }

  if (/schema cache|pgrst|could not find the function|relation .* does not exist|column .* does not exist/.test(combined))
  {
    return "backend_schema";
  }

  if (/jwt|auth|permission|forbidden|unauthorized|row.level|rls|401|403/.test(combined))
  {
    return "authorization";
  }

  if (/quota|storage|securityerror/.test(combined))
  {
    return "storage";
  }

  if (/syntaxerror|referenceerror|typeerror/.test(combined))
  {
    return "runtime";
  }

  return "unknown";
}

function alp66DiagnosticCode(category = "unknown")
{
  const map = {
    network: "NET",
    backend_schema: "DB",
    authorization: "AUTH",
    storage: "STORE",
    runtime: "JS",
    unknown: "GEN",
  };

  const stamp = String(Date.now()).slice(-6);
  return `ALP66-${map[category] || "GEN"}-${stamp}`;
}

function alp66ReadDiagnostics()
{
  const raw = alp66SessionGet(ALP66_DIAGNOSTICS_KEY, "[]");

  try
  {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return parsed.slice(-ALP66_MAX_DIAGNOSTICS);
  }
  catch (_) {}

  return alp66DiagnosticsMemory.slice(-ALP66_MAX_DIAGNOSTICS);
}

function alp66WriteDiagnostics(rows)
{
  const safeRows = Array.isArray(rows)
    ? rows.slice(-ALP66_MAX_DIAGNOSTICS)
    : [];

  alp66DiagnosticsMemory.splice(0, alp66DiagnosticsMemory.length, ...safeRows);
  alp66SessionSet(ALP66_DIAGNOSTICS_KEY, JSON.stringify(safeRows));
}

function alp66RecordDiagnostic(error, context = {})
{
  const category = alp66ErrorCategory(error);
  const row = {
    code: alp66DiagnosticCode(category),
    category,
    context: String(context.context || context.action || "runtime").slice(0, 60),
    route: String(state?.route || document.body?.dataset.entry || "unknown").slice(0, 40),
    online: navigator.onLine !== false,
    at: new Date().toISOString(),
  };

  const rows = alp66ReadDiagnostics();
  rows.push(row);
  alp66WriteDiagnostics(rows);
  return row;
}

function alp66IsTransientError(error)
{
  return alp66ErrorCategory(error) === "network";
}

function alp66Delay(ms)
{
  return new Promise(resolve => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

async function alp66RunWithRetry(loader, options = {})
{
  if (typeof loader !== "function") return undefined;

  const attempts = Math.max(1, Math.min(3, Number(options.attempts) || 2));
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1)
  {
    try
    {
      return await loader();
    }
    catch (error)
    {
      lastError = error;

      if (
        attempt >= attempts ||
        navigator.onLine === false ||
        !alp66IsTransientError(error)
      )
      {
        throw error;
      }

      await alp66Delay(350 * attempt);
    }
  }

  throw lastError;
}

function alp66NetworkBannerHost()
{
  let host = document.getElementById("alp66NetworkBanner");
  if (host) return host;

  host = document.createElement("div");
  host.id = "alp66NetworkBanner";
  host.className = "alp66-network-banner";
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.hidden = true;
  document.body.appendChild(host);
  return host;
}

function alp66ShowNetworkState(mode)
{
  const host = alp66NetworkBannerHost();
  window.clearTimeout(alp66NetworkTimer);

  if (mode === "offline")
  {
    host.className = "alp66-network-banner offline";
    host.innerHTML = `<strong>${state.language === "en" ? "No connection" : "Sin conexión"}</strong><span>${state.language === "en" ? "Your cart and favorites stay on this device. Online actions will be available when connection returns." : "Tu carrito y favoritos siguen guardados. Las acciones online volverán cuando se restablezca la conexión."}</span>`;
    host.hidden = false;
    return;
  }

  if (mode === "online")
  {
    host.className = "alp66-network-banner online";
    host.innerHTML = `<strong>${state.language === "en" ? "Connection restored" : "Conexión restablecida"}</strong><span>${state.language === "en" ? "You can continue normally." : "Ya podés continuar normalmente."}</span>`;
    host.hidden = false;
    alp66NetworkTimer = window.setTimeout(() => { host.hidden = true; }, 3200);
    return;
  }

  host.hidden = true;
}

function alp66FriendlyFailureText(category)
{
  const en = state.language === "en";

  if (category === "network")
  {
    return en
      ? "We could not connect to the store right now. Check your connection and try again."
      : "No pudimos conectarnos con la tienda en este momento. Revisá tu conexión e intentá nuevamente.";
  }

  if (category === "backend_schema")
  {
    return en
      ? "This section is temporarily unavailable due to a store configuration issue."
      : "Esta sección está temporalmente indisponible por una configuración de la tienda.";
  }

  if (category === "authorization")
  {
    return en
      ? "This action could not be authorized. Refresh the page and try again."
      : "No se pudo autorizar esta acción. Actualizá la página e intentá nuevamente.";
  }

  return en
    ? "Something did not load correctly. Your cart and favorites were not deleted."
    : "Algo no cargó correctamente. Tu carrito y favoritos no fueron eliminados.";
}

function alp66RenderFailureCard({ title, error, retryAction = "reload-data", showHome = true, context = "runtime" } = {})
{
  const row = alp66RecordDiagnostic(error, { context });
  const category = row.category;
  const en = state.language === "en";

  return `
    <section class="section alp66-recovery-section">
      <div class="container">
        <div class="alp66-recovery-card" role="alert">
          <div class="alp66-recovery-icon" aria-hidden="true">!</div>
          <div>
            <p class="eyebrow">AromaLParfum</p>
            <h2>${escapeHtml(title || (en ? "We could not load this section" : "No pudimos cargar esta sección"))}</h2>
            <p>${escapeHtml(alp66FriendlyFailureText(category))}</p>
            <small>${en ? "Diagnostic code" : "Código de diagnóstico"}: ${escapeHtml(row.code)}</small>
            <div class="alp66-recovery-actions">
              <button class="btn" type="button" data-action="${escapeAttribute(retryAction)}">${en ? "Try again" : "Reintentar"}</button>
              ${showHome ? `<button class="btn outline" type="button" data-route="home">${en ? "Go home" : "Ir al inicio"}</button>` : ""}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function alp66RenderBootstrapFailure(error)
{
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = alp66RenderFailureCard({
    title: state.language === "en" ? "AromaLParfum could not start" : "AromaLParfum no pudo iniciar",
    error,
    retryAction: "reload-data",
    showHome: false,
    context: "bootstrap",
  });
}

function alp66RenderRouteFailure(route, payload, error)
{
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = alp66RenderFailureCard({
    title: state.language === "en" ? "This section did not load" : "Esta sección no pudo cargar",
    error,
    retryAction: "retry-route",
    showHome: route !== "home",
    context: `route:${String(route || "unknown")}`,
  });
}

async function alp66RetryCurrentRoute()
{
  if (navigator.onLine === false)
  {
    alp66ShowNetworkState("offline");
    toast(state.language === "en" ? "You are offline." : "Estás sin conexión.", "error");
    return;
  }

  if (typeof alp63RouteKeys === "function")
  {
    const keys = alp63RouteKeys(state.route, state.routePayload);
    if (typeof alp63LoadedData !== "undefined")
    {
      keys.forEach(key => alp63LoadedData.delete(String(key)));
    }
    if (typeof alp63InflightData !== "undefined")
    {
      keys.forEach(key => alp63InflightData.delete(String(key)));
    }
  }

  setRoute(state.route, state.routePayload);
}

function alp66HandleActionError(error, action)
{
  const row = alp66RecordDiagnostic(error, { action: `action:${String(action || "unknown")}` });
  const category = row.category;
  toast(alp66FriendlyFailureText(category), "error");
}

function alp66DiagnosticSnapshot()
{
  const loadedKeys = typeof alp63LoadedData !== "undefined"
    ? Array.from(alp63LoadedData).map(value => String(value)).slice(0, 40)
    : [];

  return {
    product: "AromaLParfum",
    frontend_build: ALP66_BUILD,
    generated_at: new Date().toISOString(),
    online: navigator.onLine !== false,
    local_storage: typeof alp66StorageAvailable === "function" ? alp66StorageAvailable() : false,
    route: String(state?.route || document.body?.dataset.entry || "unknown"),
    entry: String(document.body?.dataset.entry || "store"),
    language: String(state?.language || "es"),
    products_loaded: Array.isArray(state?.products) ? state.products.length : 0,
    cart_lines: Array.isArray(state?.cart) ? state.cart.length : 0,
    lazy_resources_loaded: loadedKeys,
    modules: {
      checkout_v2: typeof createStoreOrderV2 === "function" || typeof openCheckout === "function",
      tracking_v2: typeof orderTrackingV2ApplyInitialRoute === "function",
      reviews_v2: typeof alp58EnsureReviewsLoaded === "function" || typeof reviewsV2LoadForProduct === "function",
      club_v2: typeof loyaltyV2ApplyInitialRoute === "function",
      analytics_v2: typeof analyticsV2Init === "function",
      security_v2: typeof alp65VerifyAdminAccess === "function",
      resilience_v2: true,
    },
    recent_errors: alp66ReadDiagnostics(),
  };
}

function alp66RenderStatusPill(ok, okText, badText)
{
  return `<span class="alp66-status-pill ${ok ? "ok" : "bad"}">${escapeHtml(ok ? okText : badText)}</span>`;
}

function alp66RenderAdminDiagnostics()
{
  const snapshot = alp66DiagnosticSnapshot();
  const rows = snapshot.recent_errors;
  const en = state.language === "en";

  return `
    <div class="alp66-diagnostics">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${en ? "Local diagnostics" : "Diagnóstico local"}</p>
          <h2>${en ? "Store health" : "Estado de la tienda"}</h2>
          <p class="muted">${en ? "This report stays in this browser tab and contains no customer names, email, phone, address or order codes." : "Este informe queda en esta pestaña y no contiene nombres, email, teléfonos, direcciones ni códigos de pedido."}</p>
        </div>
        <div class="alp66-diagnostic-actions">
          <button class="btn" type="button" data-action="admin-diagnostics-copy">${en ? "Copy report" : "Copiar informe"}</button>
          <button class="btn outline" type="button" data-action="admin-diagnostics-clear">${en ? "Clear errors" : "Limpiar errores"}</button>
        </div>
      </div>

      <div class="alp66-diagnostic-grid">
        <article class="alp66-diagnostic-card"><span>${en ? "Connection" : "Conexión"}</span>${alp66RenderStatusPill(snapshot.online, en ? "Online" : "Online", en ? "Offline" : "Sin conexión")}</article>
        <article class="alp66-diagnostic-card"><span>localStorage</span>${alp66RenderStatusPill(snapshot.local_storage, en ? "Persistent" : "Persistente", en ? "Memory fallback" : "Fallback en memoria")}</article>
        <article class="alp66-diagnostic-card"><span>${en ? "Frontend" : "Frontend"}</span><strong>PASO ${escapeHtml(snapshot.frontend_build)}</strong></article>
        <article class="alp66-diagnostic-card"><span>${en ? "Current route" : "Ruta actual"}</span><strong>${escapeHtml(snapshot.route)}</strong></article>
      </div>

      <div class="settings-card">
        <h3>${en ? "Loaded state" : "Estado cargado"}</h3>
        <div class="alp66-diagnostic-facts">
          <span>${en ? "Products in memory" : "Productos en memoria"}<strong>${formatInteger(snapshot.products_loaded)}</strong></span>
          <span>${en ? "Cart lines" : "Líneas del carrito"}<strong>${formatInteger(snapshot.cart_lines)}</strong></span>
          <span>${en ? "Lazy resources" : "Recursos lazy"}<strong>${formatInteger(snapshot.lazy_resources_loaded.length)}</strong></span>
        </div>
      </div>

      <div class="settings-card">
        <h3>${en ? "Recent sanitized errors" : "Errores sanitizados recientes"}</h3>
        ${rows.length
          ? `<div class="alp66-error-list">${rows.slice().reverse().map(row => `<div><code>${escapeHtml(row.code)}</code><span>${escapeHtml(row.category)} · ${escapeHtml(row.context)} · ${escapeHtml(row.route)}</span><time>${escapeHtml(formatDate(row.at) || row.at.slice(0, 10))}</time></div>`).join("")}</div>`
          : `<p class="muted">${en ? "No errors recorded in this tab." : "No se registraron errores en esta pestaña."}</p>`
        }
      </div>
    </div>
  `;
}

function alp66RefreshDiagnostics()
{
  if (state?.admin?.tab === "diagnostics" && typeof refreshAdminTab === "function")
  {
    refreshAdminTab();
  }
}

async function alp66CopyDiagnosticReport()
{
  const text = JSON.stringify(alp66DiagnosticSnapshot(), null, 2);

  try
  {
    await navigator.clipboard.writeText(text);
    toast(state.language === "en" ? "Diagnostic report copied." : "Informe de diagnóstico copiado.", "success");
    return;
  }
  catch (_) {}

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  try
  {
    document.execCommand("copy");
    toast(state.language === "en" ? "Diagnostic report copied." : "Informe de diagnóstico copiado.", "success");
  }
  catch (_)
  {
    toast(state.language === "en" ? "Could not copy the report." : "No se pudo copiar el informe.", "error");
  }
  finally
  {
    area.remove();
  }
}

function alp66ClearDiagnostics()
{
  alp66DiagnosticsMemory.splice(0, alp66DiagnosticsMemory.length);
  alp66SessionRemove(ALP66_DIAGNOSTICS_KEY);
  toast(state.language === "en" ? "Diagnostics cleared." : "Diagnóstico limpiado.", "success");
}

function alp66Init()
{
  // Error boundary de render. Se instala después de cargar todos los módulos y
  // antes de que events.js ejecute initialize().
  if (typeof renderCurrentRoute === "function" && !window.__alp66RenderGuardInstalled)
  {
    const originalRenderCurrentRoute = renderCurrentRoute;
    renderCurrentRoute = function alp66GuardedRenderCurrentRoute()
    {
      try
      {
        return originalRenderCurrentRoute();
      }
      catch (error)
      {
        console.error("Render de ruta falló:", error);
        alp66RenderRouteFailure(state?.route || "unknown", state?.routePayload || {}, error);
        return undefined;
      }
    };
    window.__alp66RenderGuardInstalled = true;
  }

  const setup = () =>
  {
    alp66NetworkBannerHost();
    if (navigator.onLine === false) alp66ShowNetworkState("offline");
  };

  if (document.body) setup();
  else document.addEventListener("DOMContentLoaded", setup, { once: true });

  window.addEventListener("offline", () => alp66ShowNetworkState("offline"));
  window.addEventListener("online", () => alp66ShowNetworkState("online"));

  window.addEventListener("error", event =>
  {
    if (!event?.error) return;
    alp66RecordDiagnostic(event.error, { context: "window:error" });
  });

  window.addEventListener("unhandledrejection", event =>
  {
    alp66RecordDiagnostic(event?.reason || new Error("Unhandled promise rejection"), { context: "promise:unhandled" });
  });
}

alp66Init();
