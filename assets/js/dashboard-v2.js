"use strict";

// =========================================================
// AromaLParfum — PASO 48
// Dashboard Admin V2
// Ventas + ganancias + funnel + stock + campañas + alertas
// =========================================================

const alp48DashboardState = {
  loaded: false,
  loading: false,
  error: "",
  days: 30,
  commercial: null,
  inventory: null,
  overview: null,
  analytics: null,
  analyticsError: "",
  lastLoadedAt: null,
};

window.alp48DashboardState = alp48DashboardState;

function alp48Number(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp48Percent(value)
{
  return new Intl.NumberFormat(
    state.language === "en" ? "en-US" : "es-AR",
    { maximumFractionDigits: 1 }
  ).format(alp48Number(value, 0)) + "%";
}

function alp48Date(value, withTime = false)
{
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(
    state.language === "en" ? "en-US" : "es-AR",
    withTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" }
  ).format(date);
}

function alp48Text(value, fallback = "—")
{
  const text = String(value ?? "").trim();
  return text || fallback;
}

function alp48SeverityLabel(value)
{
  const en = state.language === "en";
  const map = en
    ? { critical: "Critical", high: "High", medium: "Medium", low: "Low" }
    : { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
  return map[value] || value || "—";
}

function alp48SeverityClass(value)
{
  return ["critical", "high", "medium", "low"].includes(value)
    ? value
    : "low";
}

async function alp48LoadDashboard({ force = false, days = null } = {})
{
  if (alp48DashboardState.loading) return;

  if (Number.isFinite(Number(days)))
  {
    alp48DashboardState.days = Math.max(1, Math.min(730, Number(days)));
  }

  if (alp48DashboardState.loaded && !force)
  {
    alp48RenderIntoHost();
    return;
  }

  alp48DashboardState.loading = true;
  alp48DashboardState.error = "";
  alp48RenderIntoHost();

  try
  {
    const to = new Date();
    const from = new Date(to.getTime() - (alp48DashboardState.days * 86400000));

    const [commercialResult, inventoryResult, overviewResult, analyticsResult] = await Promise.all([
      supabaseClient.rpc("admin_get_commercial_dashboard", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      }),
      supabaseClient.rpc("admin_get_inventory_dashboard"),
      supabaseClient.rpc("admin_get_v2_overview"),
      supabaseClient.rpc("admin_get_conversion_analytics_v2", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      }),
    ]);

    if (commercialResult.error) throw commercialResult.error;
    if (inventoryResult.error) throw inventoryResult.error;
    if (overviewResult.error) throw overviewResult.error;

    alp48DashboardState.commercial = commercialResult.data || {};
    alp48DashboardState.inventory = inventoryResult.data || {};
    alp48DashboardState.overview = overviewResult.data || {};
    alp48DashboardState.analytics = analyticsResult.error ? null : (analyticsResult.data || {});
    alp48DashboardState.analyticsError = analyticsResult.error?.message || "";
    alp48DashboardState.loaded = true;
    alp48DashboardState.lastLoadedAt = new Date().toISOString();
  }
  catch (error)
  {
    console.error("PASO48 dashboard:", error);
    alp48DashboardState.error = error?.message || String(error);
  }
  finally
  {
    alp48DashboardState.loading = false;
    alp48RenderIntoHost();
  }
}

function alp48EnsureDashboardLoaded()
{
  if (state.admin?.tab !== "dashboard") return;

  if (!alp48DashboardState.loaded && !alp48DashboardState.loading)
  {
    alp48LoadDashboard();
  }
}

function alp48SetDashboardRange(days)
{
  const next = Number(days);
  if (![7, 30, 90, 365].includes(next)) return;

  if (alp48DashboardState.days === next && alp48DashboardState.loaded) return;

  alp48DashboardState.days = next;
  alp48DashboardState.loaded = false;
  alp48LoadDashboard({ force: true });
}

function alp48RefreshDashboard()
{
  alp48LoadDashboard({ force: true });
}

function alp48Kpi(label, value, note = "", tone = "")
{
  return `
    <article class="alp48-kpi ${tone ? `is-${escapeAttribute(tone)}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </article>
  `;
}

function alp48RenderFunnel(funnel, paidOrders)
{
  const en = state.language === "en";
  const visits = alp48Number(funnel?.visits, alp48Number(funnel?.sessions, 0));
  const views = alp48Number(funnel?.product_views, 0);
  const carts = alp48Number(funnel?.cart_adds, alp48Number(funnel?.carts, 0));
  const checkouts = alp48Number(funnel?.checkout_started, alp48Number(funnel?.checkouts, 0));
  const paid = alp48Number(funnel?.verified_paid_orders, paidOrders);

  const steps = [
    [en ? "Visits" : "Visitas", visits],
    [en ? "Product views" : "Vieron productos", views],
    [en ? "Cart adds" : "Agregaron al carrito", carts],
    [en ? "Checkout" : "Iniciaron checkout", checkouts],
    [en ? "Paid orders" : "Pedidos pagados", paid],
  ];

  const max = Math.max(...steps.map(([, value]) => value), 1);

  return `
    <div class="alp48-funnel">
      ${steps.map(([label, value], index) =>
      {
        const previous = index === 0 ? null : steps[index - 1][1];
        const conversion = previous > 0 ? (value / previous) * 100 : 0;
        const width = Math.max(4, Math.min(100, (value / max) * 100));

        return `
          <div class="alp48-funnel-row">
            <div class="alp48-funnel-meta">
              <strong>${escapeHtml(label)}</strong>
              <span>${formatInteger(value)}</span>
              ${previous !== null ? `<small>${alp48Percent(conversion)} ${en ? "from previous" : "del paso anterior"}</small>` : ""}
            </div>
            <div class="alp48-track"><i style="width:${width.toFixed(1)}%"></i></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function alp48RenderSalesChart(rows)
{
  const en = state.language === "en";
  const data = Array.isArray(rows) ? rows.slice(-31) : [];

  if (!data.length)
  {
    return `<div class="alp48-empty">${en ? "No paid sales in this period." : "Todavía no hay ventas pagadas en este período."}</div>`;
  }

  const maxRevenue = Math.max(...data.map(row => alp48Number(row.revenue, 0)), 1);

  return `
    <div class="alp48-sales-bars" aria-label="${en ? "Daily sales" : "Ventas diarias"}">
      ${data.map(row =>
      {
        const revenue = alp48Number(row.revenue, 0);
        const pct = Math.max(3, (revenue / maxRevenue) * 100);
        return `
          <div class="alp48-sales-day" title="${escapeAttribute(`${alp48Date(row.sale_date)} · ${money(revenue)} · ${formatInteger(row.orders)} ${en ? "orders" : "pedidos"}`)}">
            <div class="alp48-sales-bar"><i style="height:${pct.toFixed(1)}%"></i></div>
            <span>${escapeHtml(alp48Date(row.sale_date))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function alp48RenderTopProducts(rows)
{
  const en = state.language === "en";
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length)
  {
    return `<div class="alp48-empty">${en ? "No product sales yet." : "Todavía no hay ventas por producto."}</div>`;
  }

  return `
    <div class="admin-table-wrap alp48-table-wrap">
      <table class="admin-table alp48-table">
        <thead>
          <tr>
            <th>#</th>
            <th>${en ? "Product" : "Producto"}</th>
            <th>${en ? "Units" : "Unidades"}</th>
            <th>${en ? "Orders" : "Pedidos"}</th>
            <th>${en ? "Revenue" : "Facturación"}</th>
            <th>${en ? "Stock" : "Stock"}</th>
          </tr>
        </thead>
        <tbody>
          ${list.slice(0, 10).map((row, index) => `
            <tr>
              <td><strong>${index + 1}</strong></td>
              <td>
                <strong>${escapeHtml(alp48Text(row.name, "Producto"))}</strong>
                <small>${escapeHtml(alp48Text(row.brand, ""))}</small>
              </td>
              <td>${formatInteger(row.units)}</td>
              <td>${formatInteger(row.orders)}</td>
              <td>${money(row.revenue)}</td>
              <td>${formatInteger(row.current_stock)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function alp48RenderRestock(rows)
{
  const en = state.language === "en";
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length)
  {
    return `<div class="alp48-empty">${en ? "No restock purchases are suggested right now." : "No hay compras de reposición sugeridas ahora."}</div>`;
  }

  return `
    <div class="alp48-restock-list">
      ${list.slice(0, 10).map((row, index) => `
        <article class="alp48-restock-item">
          <div>
            <small>#${index + 1} · ${escapeHtml(alp48Text(row.sales_velocity, "—").replaceAll("_", " "))}</small>
            <strong>${escapeHtml(alp48Text(row.product_name, "Producto"))}</strong>
            <span>${escapeHtml(alp48Text(row.brand, ""))}</span>
          </div>
          <div class="alp48-restock-values">
            <strong>+${formatInteger(row.suggested_reorder_units)}</strong>
            <span>${row.estimated_restock_cost == null ? (en ? "Cost missing" : "Costo faltante") : money(row.estimated_restock_cost)}</span>
            <small>${row.estimated_days_of_stock == null ? "—" : `${alp48Number(row.estimated_days_of_stock).toFixed(1)} ${en ? "days left" : "días de cobertura"}`}</small>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function alp48RenderCampaigns(rows)
{
  const en = state.language === "en";
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length)
  {
    return `<div class="alp48-empty">${en ? "No campaign sales or campaign costs in this period." : "No hay ventas atribuidas ni costos de campañas en este período."}</div>`;
  }

  return `
    <div class="admin-table-wrap alp48-table-wrap">
      <table class="admin-table alp48-table">
        <thead>
          <tr>
            <th>${en ? "Campaign" : "Campaña"}</th>
            <th>${en ? "Orders" : "Pedidos"}</th>
            <th>${en ? "Revenue" : "Facturación"}</th>
            <th>${en ? "Cost" : "Costo"}</th>
            <th>ROAS</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(row => `
            <tr>
              <td><strong>${escapeHtml(alp48Text(row.name, row.slug || "Campaña"))}</strong><small>${escapeHtml(alp48Text(row.slug, ""))}</small></td>
              <td>${formatInteger(row.paid_orders)}</td>
              <td>${money(row.revenue)}</td>
              <td>${money(row.marketing_cost)}</td>
              <td>${row.roas == null ? "—" : `${alp48Number(row.roas).toFixed(2)}x`}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function alp48RenderAlerts(items)
{
  const en = state.language === "en";
  const list = Array.isArray(items) ? items : [];

  if (!list.length)
  {
    return `<div class="alp48-empty is-good">${en ? "No operational alerts." : "No hay alertas operativas."}</div>`;
  }

  return `
    <div class="alp48-alert-list">
      ${list.slice(0, 12).map(alert => `
        <article class="alp48-alert is-${escapeAttribute(alp48SeverityClass(alert.severity))}">
          <span class="alp48-alert-dot"></span>
          <div>
            <small>${escapeHtml(alp48SeverityLabel(alert.severity))} · ${escapeHtml(alp48Text(alert.category, "general"))}</small>
            <strong>${escapeHtml(alp48Text(alert.title, en ? "Alert" : "Alerta"))}</strong>
            <p>${escapeHtml(alp48Text(alert.message, ""))}</p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function alp48RenderActivity(overview)
{
  const en = state.language === "en";
  const drafts = Array.isArray(overview?.drafts?.recent) ? overview.drafts.recent : [];
  const history = Array.isArray(overview?.change_history) ? overview.change_history : [];

  return `
    <div class="alp48-activity-grid">
      <div>
        <div class="alp48-subhead">
          <strong>${en ? "Active drafts" : "Borradores activos"}</strong>
          <span>${formatInteger(overview?.drafts?.active || 0)}</span>
        </div>
        <div class="alp48-mini-list">
          ${drafts.length ? drafts.slice(0, 6).map(row => `
            <div class="alp48-mini-row">
              <div><strong>${escapeHtml(alp48Text(row.entity_type, "draft"))}</strong><small>${escapeHtml(alp48Text(row.entity_ref, "—"))}</small></div>
              <time>${escapeHtml(alp48Date(row.updated_at, true))}</time>
            </div>
          `).join("") : `<div class="alp48-empty">${en ? "No active drafts." : "No hay borradores activos."}</div>`}
        </div>
      </div>

      <div>
        <div class="alp48-subhead">
          <strong>${en ? "Recent changes" : "Cambios recientes"}</strong>
        </div>
        <div class="alp48-mini-list">
          ${history.length ? history.slice(0, 8).map(row => `
            <div class="alp48-mini-row">
              <div><strong>${escapeHtml(alp48Text(row.entity_type, "entity"))}</strong><small>${escapeHtml(`${alp48Text(row.action, "update")} · ${alp48Text(row.entity_ref, "—")}`)}</small></div>
              <time>${escapeHtml(alp48Date(row.created_at, true))}</time>
            </div>
          `).join("") : `<div class="alp48-empty">${en ? "No changes registered yet." : "Todavía no hay cambios registrados."}</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderAdminDashboardV2()
{
  const en = state.language === "en";
  const commercial = alp48DashboardState.commercial || {};
  const inventory = alp48DashboardState.inventory || {};
  const overview = alp48DashboardState.overview || {};
  const summary = commercial.summary || {};
  const funnel = alp48DashboardState.analytics?.funnel || commercial.funnel || {};
  const stock = inventory.summary || {};

  if (alp48DashboardState.loading && !alp48DashboardState.loaded)
  {
    return `
      <section class="alp48-dashboard">
        <div class="alp48-loading">
          <div class="spinner"></div>
          <p>${en ? "Loading business dashboard…" : "Cargando dashboard comercial…"}</p>
        </div>
      </section>
    `;
  }

  if (alp48DashboardState.error && !alp48DashboardState.loaded)
  {
    return `
      <section class="alp48-dashboard">
        <div class="admin-message error">${escapeHtml(alp48DashboardState.error)}</div>
        <button class="btn" type="button" data-action="admin-dashboard-refresh">${en ? "Retry" : "Reintentar"}</button>
      </section>
    `;
  }

  const paidOrders = alp48Number(summary.paid_orders, 0);
  const revenue = alp48Number(summary.revenue, 0);
  const knownProfit = alp48Number(summary.known_profit, 0);
  const avgTicket = alp48Number(summary.average_ticket, 0);
  const missingCosts = alp48Number(summary.orders_with_missing_cost, 0);
  const completeCosts = alp48Number(summary.orders_with_complete_cost, 0);

  return `
    <section class="alp48-dashboard">
      <div class="alp48-head">
        <div>
          <p class="eyebrow">Admin V2</p>
          <h2>${en ? "Business dashboard" : "Dashboard del negocio"}</h2>
          <p>${en ? "Verified sales, profit, funnel, stock, campaigns and operational alerts." : "Ventas verificadas, ganancia, embudo, stock, campañas y alertas operativas."}</p>
        </div>

        <div class="alp48-head-actions">
          <div class="alp48-range" aria-label="${en ? "Date range" : "Rango"}">
            ${[7, 30, 90, 365].map(days => `
              <button type="button" class="${alp48DashboardState.days === days ? "active" : ""}" data-action="admin-dashboard-range" data-days="${days}">
                ${days === 365 ? "1A" : `${days}D`}
              </button>
            `).join("")}
          </div>
          <button class="btn outline" type="button" data-action="admin-dashboard-refresh">${en ? "Refresh" : "Actualizar"}</button>
        </div>
      </div>

      ${alp48DashboardState.error ? `<div class="admin-message error">${escapeHtml(alp48DashboardState.error)}</div>` : ""}

      <div class="alp48-kpis">
        ${alp48Kpi(en ? "Revenue" : "Facturación", money(revenue), `${formatInteger(paidOrders)} ${en ? "paid orders" : "pedidos pagados"}`)}
        ${alp48Kpi(en ? "Known profit" : "Ganancia conocida", money(knownProfit), completeCosts ? `${formatInteger(completeCosts)} ${en ? "orders with complete cost" : "pedidos con costo completo"}` : (en ? "No complete costs yet" : "Sin costos completos todavía"), "profit")}
        ${alp48Kpi(en ? "Average ticket" : "Ticket promedio", money(avgTicket), `${formatInteger(summary.customers || 0)} ${en ? "customers" : "clientes"}`)}
        ${alp48Kpi(en ? "Missing costs" : "Costos faltantes", formatInteger(missingCosts), missingCosts ? (en ? "Profit is intentionally incomplete" : "La ganancia se muestra incompleta a propósito") : (en ? "Cost coverage OK" : "Cobertura de costos OK"), missingCosts ? "warning" : "good")}
        ${alp48Kpi(en ? "Need restock" : "Necesitan reposición", formatInteger(stock.need_restock || 0), stock.estimated_restock_cost != null ? money(stock.estimated_restock_cost) : "—", alp48Number(stock.need_restock, 0) ? "warning" : "good")}
        ${alp48Kpi(en ? "Out of stock" : "Sin stock", formatInteger(stock.out_of_stock || 0), `${formatInteger(stock.immobilized || 0)} ${en ? "immobilized" : "inmovilizados"}`, alp48Number(stock.out_of_stock, 0) ? "danger" : "good")}
      </div>

      <div class="alp48-grid two">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "CONVERSION" : "CONVERSIÓN"}</small><h3>${en ? "Sales funnel" : "Embudo de ventas"}</h3></div></div>
          ${alp48RenderFunnel(funnel, paidOrders)}
        </article>

        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "PERIOD" : "PERÍODO"}</small><h3>${en ? "Daily revenue" : "Facturación diaria"}</h3></div><span>${alp48DashboardState.days}D</span></div>
          ${alp48RenderSalesChart(commercial.daily_sales)}
        </article>
      </div>

      <div class="alp48-grid two alp48-main-grid">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>TOP 10</small><h3>${en ? "Best-selling products" : "Productos que más venden"}</h3></div></div>
          ${alp48RenderTopProducts(commercial.top_products)}
        </article>

        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "PURCHASE PLAN" : "PLAN DE COMPRA"}</small><h3>${en ? "Suggested restock" : "Reposición sugerida"}</h3></div><span>${money(stock.estimated_restock_cost || 0)}</span></div>
          ${alp48RenderRestock(inventory.restock_plan)}
        </article>
      </div>

      <div class="alp48-grid two">
        <article class="alp48-card">
          <div class="alp48-card-head"><div><small>${en ? "ATTRIBUTION" : "ATRIBUCIÓN"}</small><h3>${en ? "Campaign performance" : "Rendimiento de campañas"}</h3></div></div>
          ${alp48RenderCampaigns(commercial.campaigns)}
        </article>

        <article class="alp48-card">
          <div class="alp48-card-head">
            <div><small>${en ? "OPERATIONS" : "OPERACIONES"}</small><h3>${en ? "Unified alerts" : "Centro de alertas"}</h3></div>
            <div class="alp48-alert-counts">
              <b>${formatInteger(overview?.alerts?.critical || 0)}</b> ${en ? "critical" : "críticas"} ·
              <b>${formatInteger(overview?.alerts?.high || 0)}</b> ${en ? "high" : "altas"}
            </div>
          </div>
          ${alp48RenderAlerts(overview?.alerts?.items)}
        </article>
      </div>

      <article class="alp48-card">
        <div class="alp48-card-head"><div><small>ADMIN V2</small><h3>${en ? "Drafts and recent activity" : "Borradores y actividad reciente"}</h3></div></div>
        ${alp48RenderActivity(overview)}
      </article>

      <p class="alp48-footnote">
        ${en
          ? "Financial metrics come only from verified paid orders. Browser analytics events never count as revenue. Profit remains 'known' when some orders are missing cost data."
          : "Los números financieros salen únicamente de pedidos pagados verificados. Los eventos del navegador nunca cuentan como facturación. La ganancia se muestra como 'conocida' cuando todavía faltan costos en algunos pedidos."
        }
        ${alp48DashboardState.analyticsError ? ` · ${en ? "Analytics not available until PASO 61 SQL is installed." : "Analytics no estará disponible hasta ejecutar el SQL del PASO 61."}` : ""}
        ${alp48DashboardState.lastLoadedAt ? ` · ${en ? "Updated" : "Actualizado"}: ${escapeHtml(alp48Date(alp48DashboardState.lastLoadedAt, true))}` : ""}
      </p>
    </section>
  `;
}

function alp48RenderIntoHost()
{
  if (state.admin?.tab !== "dashboard") return;
  const host = document.getElementById("adminTabContent");
  if (host) host.innerHTML = renderAdminDashboardV2();
}

window.renderAdminDashboardV2 = renderAdminDashboardV2;
window.alp48EnsureDashboardLoaded = alp48EnsureDashboardLoaded;
window.alp48LoadDashboard = alp48LoadDashboard;
window.alp48SetDashboardRange = alp48SetDashboardRange;
window.alp48RefreshDashboard = alp48RefreshDashboard;
