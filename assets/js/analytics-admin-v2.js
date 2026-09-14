"use strict";

// =========================================================
// AromaLParfum — PASO 61
// Admin Analytics First‑Party V2
// =========================================================

const alp61AdminAnalyticsState = {
  loaded: false,
  loading: false,
  error: "",
  days: 30,
  data: null,
  lastLoadedAt: null,
};

window.alp61AdminAnalyticsState = alp61AdminAnalyticsState;

function alp61Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp61Pct(value)
{
  return `${new Intl.NumberFormat(state.language === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 1 }).format(alp61Num(value))}%`;
}

function alp61AdminDate(value)
{
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "es-AR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function alp61LoadAdminAnalytics({ force = false, days = null } = {})
{
  if (alp61AdminAnalyticsState.loading) return;

  if (Number.isFinite(Number(days)))
  {
    alp61AdminAnalyticsState.days = Math.max(1, Math.min(365, Number(days)));
  }

  if (alp61AdminAnalyticsState.loaded && !force)
  {
    alp61RenderAdminAnalyticsIntoHost();
    return;
  }

  alp61AdminAnalyticsState.loading = true;
  alp61AdminAnalyticsState.error = "";
  alp61RenderAdminAnalyticsIntoHost();

  try
  {
    const to = new Date();
    const from = new Date(to.getTime() - alp61AdminAnalyticsState.days * 86400000);
    const result = await supabaseClient.rpc("admin_get_conversion_analytics_v2", {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });

    if (result.error) throw result.error;

    alp61AdminAnalyticsState.data = result.data || {};
    alp61AdminAnalyticsState.loaded = true;
    alp61AdminAnalyticsState.lastLoadedAt = new Date().toISOString();
  }
  catch (error)
  {
    console.error("PASO61 Analytics Admin:", error);
    alp61AdminAnalyticsState.error = error?.message || String(error);
  }
  finally
  {
    alp61AdminAnalyticsState.loading = false;
    alp61RenderAdminAnalyticsIntoHost();
  }
}

function alp61EnsureAdminAnalyticsLoaded()
{
  if (state.admin?.tab !== "analytics") return;
  if (!alp61AdminAnalyticsState.loaded && !alp61AdminAnalyticsState.loading)
  {
    alp61LoadAdminAnalytics();
  }
}

function alp61SetAdminAnalyticsRange(days)
{
  const value = Number(days);
  if (![7, 30, 90, 365].includes(value)) return;
  alp61AdminAnalyticsState.days = value;
  alp61AdminAnalyticsState.loaded = false;
  alp61LoadAdminAnalytics({ force: true });
}

async function alp61PurgeAnalytics()
{
  const en = state.language === "en";
  const ok = globalThis.confirm(
    en
      ? "Delete anonymous analytics events older than 180 days? This does not delete orders or customers."
      : "¿Eliminar eventos anónimos de Analytics con más de 180 días? No elimina pedidos ni clientes."
  );

  if (!ok) return;

  try
  {
    const result = await supabaseClient.rpc("admin_purge_analytics_v2", { p_keep_days: 180 });
    if (result.error) throw result.error;

    const deleted = alp61Num(result.data?.deleted, 0);
    toast(
      en ? `${deleted} old analytics events deleted.` : `Se eliminaron ${deleted} eventos antiguos de Analytics.`,
      "ok"
    );

    await alp61LoadAdminAnalytics({ force: true });
  }
  catch (error)
  {
    toast(error?.message || String(error), "error");
  }
}

function alp61FunnelRows(funnel)
{
  const en = state.language === "en";
  const rows = [
    [en ? "Sessions" : "Sesiones", alp61Num(funnel?.sessions)],
    [en ? "Product viewers" : "Vieron producto", alp61Num(funnel?.product_views)],
    [en ? "Added to cart" : "Agregaron al carrito", alp61Num(funnel?.cart_adds)],
    [en ? "Checkout started" : "Iniciaron checkout", alp61Num(funnel?.checkout_started)],
    [en ? "Paid orders" : "Pedidos pagados", alp61Num(funnel?.verified_paid_orders)],
  ];

  const max = Math.max(1, ...rows.map(([, value]) => value));

  return `
    <div class="alp61-funnel">
      ${rows.map(([label, value], index) =>
      {
        const previous = index ? rows[index - 1][1] : null;
        const conversion = previous > 0 ? value / previous * 100 : 0;
        const width = Math.max(value > 0 ? 4 : 0, Math.min(100, value / max * 100));
        return `
          <div class="alp61-funnel-row">
            <div class="alp61-funnel-label">
              <strong>${escapeHtml(label)}</strong>
              <span>${formatInteger(value)}</span>
              ${previous !== null ? `<small>${alp61Pct(conversion)} ${en ? "from previous step" : "del paso anterior"}</small>` : ""}
            </div>
            <div class="alp61-funnel-track"><i style="width:${width.toFixed(1)}%"></i></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function alp61SimpleTable(rows, columns, emptyText)
{
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return `<div class="alp48-empty">${escapeHtml(emptyText)}</div>`;

  return `
    <div class="admin-table-wrap alp61-table-wrap">
      <table class="admin-table alp61-table">
        <thead><tr>${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${list.map(row => `
            <tr>
              ${columns.map(col => `<td>${col.render ? col.render(row) : escapeHtml(String(row?.[col.key] ?? "—"))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function alp61DailyBars(rows)
{
  const list = Array.isArray(rows) ? rows.slice(-31) : [];
  const en = state.language === "en";
  if (!list.length) return `<div class="alp48-empty">${en ? "No session data yet." : "Todavía no hay datos de sesiones."}</div>`;

  const max = Math.max(1, ...list.map(row => alp61Num(row.sessions)));

  return `
    <div class="alp61-daily-bars">
      ${list.map(row =>
      {
        const sessions = alp61Num(row.sessions);
        const height = Math.max(sessions ? 4 : 0, sessions / max * 100);
        return `
          <div class="alp61-daily-item" title="${escapeAttribute(`${row.day} · ${sessions} ${en ? "sessions" : "sesiones"}`)}">
            <div><i style="height:${height.toFixed(1)}%"></i></div>
            <span>${escapeHtml(String(row.day || "").slice(5))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdminAnalyticsV2()
{
  const en = state.language === "en";

  if (alp61AdminAnalyticsState.loading && !alp61AdminAnalyticsState.loaded)
  {
    return `<section class="alp61-admin"><div class="alp48-loading"><div class="spinner"></div><p>${en ? "Loading first-party analytics…" : "Cargando Analytics propio…"}</p></div></section>`;
  }

  if (alp61AdminAnalyticsState.error && !alp61AdminAnalyticsState.loaded)
  {
    return `
      <section class="alp61-admin">
        <div class="admin-message error">${escapeHtml(alp61AdminAnalyticsState.error)}</div>
        <button class="btn" type="button" data-action="admin-analytics-refresh">${en ? "Retry" : "Reintentar"}</button>
      </section>
    `;
  }

  const data = alp61AdminAnalyticsState.data || {};
  const funnel = data.funnel || {};
  const sessions = alp61Num(funnel.sessions);
  const paid = alp61Num(funnel.verified_paid_orders);
  const endToEnd = sessions > 0 ? paid / sessions * 100 : 0;

  return `
    <section class="alp61-admin">
      <div class="alp48-head">
        <div>
          <p class="eyebrow">First‑Party Analytics V2</p>
          <h2>${en ? "Conversion analytics" : "Analytics de conversión"}</h2>
          <p>${en ? "Anonymous store behavior, campaign attribution and the real conversion funnel — without third-party trackers." : "Comportamiento anónimo de la tienda, atribución de campañas y embudo real — sin trackers de terceros."}</p>
        </div>

        <div class="alp48-head-actions">
          <div class="alp48-range">
            ${[7, 30, 90, 365].map(days => `<button type="button" class="${alp61AdminAnalyticsState.days === days ? "active" : ""}" data-action="admin-analytics-range" data-days="${days}">${days === 365 ? "1A" : `${days}D`}</button>`).join("")}
          </div>
          <button class="btn outline" type="button" data-action="admin-analytics-refresh">${en ? "Refresh" : "Actualizar"}</button>
          <button class="btn outline" type="button" data-action="admin-analytics-purge">${en ? "Clean >180d" : "Limpiar >180d"}</button>
        </div>
      </div>

      ${alp61AdminAnalyticsState.error ? `<div class="admin-message error">${escapeHtml(alp61AdminAnalyticsState.error)}</div>` : ""}

      <div class="alp48-kpis">
        ${alp48Kpi(en ? "Sessions" : "Sesiones", formatInteger(sessions), `${formatInteger(data.event_count || 0)} ${en ? "anonymous events" : "eventos anónimos"}`)}
        ${alp48Kpi(en ? "Product viewers" : "Vieron producto", formatInteger(funnel.product_views || 0), sessions ? alp61Pct(alp61Num(funnel.product_views) / sessions * 100) : "0%")}
        ${alp48Kpi(en ? "Cart sessions" : "Sesiones con carrito", formatInteger(funnel.cart_adds || 0), alp61Pct(funnel.product_to_cart_rate || 0))}
        ${alp48Kpi(en ? "Checkout sessions" : "Sesiones con checkout", formatInteger(funnel.checkout_started || 0), alp61Pct(funnel.cart_to_checkout_rate || 0))}
        ${alp48Kpi(en ? "Paid orders" : "Pedidos pagados", formatInteger(paid), `${alp61Pct(endToEnd)} ${en ? "session → paid" : "sesión → pagado"}`, "profit")}
        ${alp48Kpi(en ? "Tracked devices" : "Dispositivos", formatInteger((data.devices || []).reduce((sum, row) => sum + alp61Num(row.sessions), 0)), en ? "Anonymous classification" : "Clasificación anónima")}
      </div>

      <div class="alp48-grid two">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "FUNNEL" : "EMBUDO"}</small><h3>${en ? "Store conversion" : "Conversión de la tienda"}</h3></div></div>
          ${alp61FunnelRows(funnel)}
        </article>
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "TREND" : "TENDENCIA"}</small><h3>${en ? "Sessions per day" : "Sesiones por día"}</h3></div></div>
          ${alp61DailyBars(data.daily)}
        </article>
      </div>

      <div class="alp48-grid two">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "ACQUISITION" : "ADQUISICIÓN"}</small><h3>${en ? "Traffic sources" : "Fuentes de tráfico"}</h3></div></div>
          ${alp61SimpleTable(data.sources, [
            { label: en ? "Source" : "Fuente", render: row => `<strong>${escapeHtml(row.source || (en ? "Direct" : "Directo"))}</strong><small>${escapeHtml(row.medium || "")}</small>` },
            { label: en ? "Sessions" : "Sesiones", render: row => formatInteger(row.sessions) },
            { label: en ? "Share" : "%", render: row => alp61Pct(row.share_pct) },
          ], en ? "No acquisition data yet." : "Todavía no hay datos de adquisición.")}
        </article>

        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "DEVICES" : "DISPOSITIVOS"}</small><h3>${en ? "Device mix" : "Mix de dispositivos"}</h3></div></div>
          ${alp61SimpleTable(data.devices, [
            { label: en ? "Type" : "Tipo", render: row => `<strong>${escapeHtml(row.device_class || "—")}</strong>` },
            { label: en ? "Sessions" : "Sesiones", render: row => formatInteger(row.sessions) },
            { label: en ? "Share" : "%", render: row => alp61Pct(row.share_pct) },
          ], en ? "No device data yet." : "Todavía no hay datos de dispositivos.")}
        </article>
      </div>

      <div class="alp48-grid two alp48-main-grid">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>TOP</small><h3>${en ? "Products by interest" : "Productos por interés"}</h3></div></div>
          ${alp61SimpleTable(data.top_products, [
            { label: en ? "Product" : "Producto", render: row => `<strong>${escapeHtml(row.name || "Producto")}</strong><small>${escapeHtml(row.brand || "")}</small>` },
            { label: en ? "View sessions" : "Sesiones vista", render: row => formatInteger(row.view_sessions) },
            { label: en ? "Cart sessions" : "Sesiones carrito", render: row => formatInteger(row.cart_sessions) },
            { label: en ? "View → cart" : "Vista → carrito", render: row => alp61Pct(row.view_to_cart_rate) },
          ], en ? "No product behavior yet." : "Todavía no hay comportamiento por producto.")}
        </article>

        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "CAMPAIGNS" : "CAMPAÑAS"}</small><h3>${en ? "Campaign sessions" : "Sesiones por campaña"}</h3></div></div>
          ${alp61SimpleTable(data.campaigns, [
            { label: en ? "Campaign" : "Campaña", render: row => `<strong>${escapeHtml(row.campaign_slug || "—")}</strong>` },
            { label: en ? "Sessions" : "Sesiones", render: row => formatInteger(row.sessions) },
            { label: en ? "Product viewers" : "Vieron producto", render: row => formatInteger(row.product_view_sessions) },
            { label: en ? "Cart" : "Carrito", render: row => formatInteger(row.cart_sessions) },
          ], en ? "No campaign behavior yet." : "Todavía no hay comportamiento atribuido a campañas.")}
        </article>
      </div>

      <article class="alp48-card">
        <div class="alp48-card-head"><div><small>${en ? "PRIVACY" : "PRIVACIDAD"}</small><h3>${en ? "What is stored" : "Qué se guarda"}</h3></div></div>
        <p class="alp61-privacy-copy">
          ${en
            ? "AromaLParfum stores only anonymous funnel events: a hashed session identifier, route, product ID, campaign/UTM attribution, device class and cart quantities. It does not store names, emails, phone numbers, addresses, IPs or free-text content in Analytics. Revenue continues to come only from verified orders."
            : "AromaLParfum guarda únicamente eventos anónimos del embudo: identificador de sesión hasheado, ruta, ID de producto, campaña/UTM, tipo de dispositivo y cantidades del carrito. Analytics no guarda nombres, emails, teléfonos, direcciones, IP ni texto libre. La facturación sigue saliendo únicamente de pedidos verificados."
          }
        </p>
        <small>${en ? "Last refresh" : "Última actualización"}: ${escapeHtml(alp61AdminDate(alp61AdminAnalyticsState.lastLoadedAt))}</small>
      </article>
    </section>
  `;
}

function alp61RenderAdminAnalyticsIntoHost()
{
  if (state.admin?.tab !== "analytics") return;
  const host = document.getElementById("adminTabContent");
  if (host) host.innerHTML = renderAdminAnalyticsV2();
}

window.renderAdminAnalyticsV2 = renderAdminAnalyticsV2;
window.alp61LoadAdminAnalytics = alp61LoadAdminAnalytics;
window.alp61EnsureAdminAnalyticsLoaded = alp61EnsureAdminAnalyticsLoaded;
window.alp61SetAdminAnalyticsRange = alp61SetAdminAnalyticsRange;
window.alp61PurgeAnalytics = alp61PurgeAnalytics;
