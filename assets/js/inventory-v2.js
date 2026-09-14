"use strict";

// =========================================================
// AromaLParfum — PASO 50
// Inventario V2 (solo Admin)
// Stock + velocidad + cobertura + reposición + estrategia
// =========================================================

const ALP50_PAGE_SIZE = 20;

const alp50InventoryState = {
  loaded: false,
  loading: false,
  error: "",
  rows: [],
  count: 0,
  page: 1,
  pageSize: ALP50_PAGE_SIZE,
  query: "",
  status: "all",
  velocity: "all",
  dashboard: null,
  immobilizedCapital: 0,
  selectedId: null,
  saving: false,
};

window.alp50InventoryState = alp50InventoryState;

function alp50Text(value, fallback = "—")
{
  const text = String(value ?? "").trim();
  return text || fallback;
}

function alp50Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp50Integer(value)
{
  return new Intl.NumberFormat(
    state.language === "en" ? "en-US" : "es-AR",
    { maximumFractionDigits: 0 }
  ).format(alp50Num(value, 0));
}

function alp50Decimal(value, digits = 1)
{
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat(
    state.language === "en" ? "en-US" : "es-AR",
    { minimumFractionDigits: 0, maximumFractionDigits: digits }
  ).format(n);
}

function alp50Money(value)
{
  if (value === null || value === undefined || value === "") return "—";
  return formatMoney(alp50Num(value, 0));
}

function alp50Date(value)
{
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(
    state.language === "en" ? "en-US" : "es-AR",
    { dateStyle: "short" }
  ).format(date);
}

function alp50StatusLabel(value)
{
  const en = state.language === "en";
  const esMap = {
    sin_stock: "Sin stock",
    reponer: "Reponer",
    stock_bajo: "Stock bajo",
    inmovilizado: "Inmovilizado",
    saludable: "Saludable",
  };
  const enMap = {
    sin_stock: "Out of stock",
    reponer: "Restock",
    stock_bajo: "Low stock",
    inmovilizado: "Dead stock",
    saludable: "Healthy",
  };
  return (en ? enMap : esMap)[value] || alp50Text(value);
}

function alp50VelocityLabel(value)
{
  const en = state.language === "en";
  const esMap = {
    muy_alta: "Muy alta",
    alta: "Alta",
    media: "Media",
    baja: "Baja",
    sin_ventas: "Sin ventas",
  };
  const enMap = {
    muy_alta: "Very high",
    alta: "High",
    media: "Medium",
    baja: "Low",
    sin_ventas: "No sales",
  };
  return (en ? enMap : esMap)[value] || alp50Text(value);
}

function alp50StatusBadge(value)
{
  const cls = ["sin_stock", "reponer", "stock_bajo", "inmovilizado", "saludable"].includes(value)
    ? value
    : "saludable";

  return `<span class="alp50-badge is-${escapeAttribute(cls)}">${escapeHtml(alp50StatusLabel(value))}</span>`;
}

function alp50VelocityBadge(value)
{
  const cls = ["muy_alta", "alta", "media", "baja", "sin_ventas"].includes(value)
    ? value
    : "sin_ventas";

  return `<span class="alp50-velocity is-${escapeAttribute(cls)}">${escapeHtml(alp50VelocityLabel(value))}</span>`;
}

function alp50CleanSearch(value)
{
  return String(value || "")
    .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function alp50BuildRowsQuery()
{
  const start = (alp50InventoryState.page - 1) * alp50InventoryState.pageSize;
  const end = start + alp50InventoryState.pageSize - 1;

  let query = supabaseClient
    .from("admin_inventory_intelligence")
    .select(
      [
        "product_id",
        "product_name",
        "brand",
        "sale_price",
        "unit_cost",
        "closed_stock_units",
        "open_decant_ml",
        "bottle_ml",
        "available_equivalent_units",
        "equivalent_units_30d",
        "equivalent_units_90d",
        "avg_daily_units_30d",
        "avg_daily_units_90d",
        "sales_velocity",
        "last_sale_at",
        "low_stock_threshold",
        "restock_target",
        "lead_time_days",
        "safety_stock_units",
        "target_coverage_days",
        "reorder_point_units",
        "estimated_days_of_stock",
        "suggested_reorder_units",
        "immobilized_days",
        "reorder_enabled",
        "stock_status",
        "priority_score",
        "estimated_restock_cost",
        "capital_in_closed_stock",
      ].join(","),
      { count: "exact" }
    );

  if (alp50InventoryState.status !== "all")
  {
    query = query.eq("stock_status", alp50InventoryState.status);
  }

  if (alp50InventoryState.velocity !== "all")
  {
    query = query.eq("sales_velocity", alp50InventoryState.velocity);
  }

  const cleaned = alp50CleanSearch(alp50InventoryState.query);
  if (cleaned)
  {
    query = query.or(`product_name.ilike.%${cleaned}%,brand.ilike.%${cleaned}%`);
  }

  return query
    .order("priority_score", { ascending: false })
    .order("product_name", { ascending: true })
    .range(start, end);
}

async function alp50LoadInventory({ force = false } = {})
{
  if (alp50InventoryState.loading) return;

  if (alp50InventoryState.loaded && !force)
  {
    alp50RenderIntoHost();
    return;
  }

  alp50InventoryState.loading = true;
  alp50InventoryState.error = "";
  alp50RenderIntoHost();

  try
  {
    const rowsQuery = alp50BuildRowsQuery();

    const [dashboardResult, rowsResult, immobilizedResult] = await Promise.all([
      supabaseClient.rpc("admin_get_inventory_dashboard"),
      rowsQuery,
      supabaseClient
        .from("admin_inventory_intelligence")
        .select("capital_in_closed_stock")
        .eq("stock_status", "inmovilizado"),
    ]);

    if (dashboardResult.error) throw dashboardResult.error;
    if (rowsResult.error) throw rowsResult.error;
    if (immobilizedResult.error) throw immobilizedResult.error;

    alp50InventoryState.dashboard = dashboardResult.data || {};
    alp50InventoryState.rows = Array.isArray(rowsResult.data) ? rowsResult.data : [];
    alp50InventoryState.count = Number(rowsResult.count || 0);
    alp50InventoryState.immobilizedCapital = (immobilizedResult.data || [])
      .reduce((sum, row) => sum + alp50Num(row.capital_in_closed_stock, 0), 0);

    const totalPages = Math.max(1, Math.ceil(alp50InventoryState.count / alp50InventoryState.pageSize));
    if (alp50InventoryState.page > totalPages)
    {
      alp50InventoryState.page = totalPages;
      alp50InventoryState.loaded = false;
      alp50InventoryState.loading = false;
      return alp50LoadInventory({ force: true });
    }

    if (alp50InventoryState.selectedId)
    {
      alp50InventoryState.selectedId = Number(alp50InventoryState.selectedId);
    }

    alp50InventoryState.loaded = true;
  }
  catch (error)
  {
    console.error("PASO50 inventory:", error);
    alp50InventoryState.error = error?.message || String(error);
  }
  finally
  {
    alp50InventoryState.loading = false;
    alp50RenderIntoHost();
  }
}

function alp50EnsureInventoryLoaded()
{
  if (!alp50InventoryState.loaded && !alp50InventoryState.loading)
  {
    alp50LoadInventory();
  }
}

function alp50RenderIntoHost()
{
  if (state.admin.tab !== "inventory") return;

  const host = document.getElementById("adminTabContent");
  if (host)
  {
    host.innerHTML = renderAdminInventoryV2();
  }
}

function alp50Summary()
{
  return alp50InventoryState.dashboard?.summary || {};
}

function alp50RestockPlan()
{
  const rows = alp50InventoryState.dashboard?.restock_plan;
  return Array.isArray(rows) ? rows : [];
}

function alp50Kpi(label, value, note = "", cls = "")
{
  return `
    <article class="alp50-kpi ${escapeAttribute(cls)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </article>
  `;
}

function alp50RenderRestockPlan()
{
  const en = state.language === "en";
  const rows = alp50RestockPlan().slice(0, 10);

  if (!rows.length)
  {
    return `
      <div class="alp50-empty is-good">
        <strong>${en ? "No urgent purchases" : "Sin compras urgentes"}</strong>
        <span>${en ? "The current restock plan is clear." : "El plan de reposición actual está despejado."}</span>
      </div>
    `;
  }

  return `
    <div class="alp50-restock-list">
      ${rows.map((row, index) => `
        <button
          type="button"
          class="alp50-restock-row"
          data-action="admin-inventory-open"
          data-product-id="${escapeAttribute(row.product_id)}">
          <span class="alp50-restock-rank">${index + 1}</span>
          <span class="alp50-restock-name">
            <strong>${escapeHtml(alp50Text(row.product_name))}</strong>
            <small>${escapeHtml(alp50Text(row.brand, en ? "No brand" : "Sin marca"))} · ${escapeHtml(alp50VelocityLabel(row.sales_velocity))}</small>
          </span>
          <span class="alp50-restock-qty">
            <strong>+${escapeHtml(alp50Integer(row.suggested_reorder_units))}</strong>
            <small>${alp50Money(row.estimated_restock_cost)}</small>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function alp50RenderTable()
{
  const en = state.language === "en";
  const rows = alp50InventoryState.rows;

  if (!rows.length)
  {
    return `
      <div class="alp50-empty">
        <strong>${en ? "No products found" : "No encontramos productos"}</strong>
        <span>${en ? "Change the filters or clear the search." : "Cambiá los filtros o limpiá la búsqueda."}</span>
      </div>
    `;
  }

  return `
    <div class="admin-table-wrap alp50-table-wrap">
      <table class="admin-table alp50-table">
        <thead>
          <tr>
            <th>${en ? "Product" : "Producto"}</th>
            <th>${en ? "Status" : "Estado"}</th>
            <th>${en ? "Stock" : "Stock"}</th>
            <th>${en ? "Sales 30d" : "Ventas 30d"}</th>
            <th>${en ? "Coverage" : "Cobertura"}</th>
            <th>${en ? "Suggestion" : "Sugerencia"}</th>
            <th>${en ? "Purchase cost" : "Costo compra"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>
                <strong>${escapeHtml(alp50Text(row.product_name))}</strong>
                <small>${escapeHtml(alp50Text(row.brand, en ? "No brand" : "Sin marca"))}</small>
              </td>
              <td>
                ${alp50StatusBadge(row.stock_status)}
                ${alp50VelocityBadge(row.sales_velocity)}
              </td>
              <td>
                <strong>${escapeHtml(alp50Decimal(row.closed_stock_units, 2))}</strong>
                <small>${alp50Num(row.open_decant_ml, 0) > 0 ? `${escapeHtml(alp50Decimal(row.open_decant_ml, 0))} ml ${en ? "open" : "abiertos"}` : `${escapeHtml(alp50Decimal(row.available_equivalent_units, 2))} ${en ? "equiv." : "equiv."}`}</small>
              </td>
              <td>
                <strong>${escapeHtml(alp50Decimal(row.equivalent_units_30d, 2))}</strong>
                <small>${escapeHtml(alp50VelocityLabel(row.sales_velocity))}</small>
              </td>
              <td>
                <strong>${row.estimated_days_of_stock == null ? "—" : `${escapeHtml(alp50Decimal(row.estimated_days_of_stock, 1))} ${en ? "days" : "días"}`}</strong>
                <small>${en ? "Reorder point" : "Punto reposición"}: ${escapeHtml(alp50Integer(row.reorder_point_units))}</small>
              </td>
              <td>
                <strong>${alp50Num(row.suggested_reorder_units, 0) > 0 ? `+${escapeHtml(alp50Integer(row.suggested_reorder_units))}` : "—"}</strong>
                <small>${row.estimated_restock_cost == null ? (en ? "Missing cost" : "Costo faltante") : alp50Money(row.estimated_restock_cost)}</small>
              </td>
              <td>
                <strong>${alp50Money(row.unit_cost)}</strong>
                <small>${en ? "Capital" : "Capital"}: ${alp50Money(row.capital_in_closed_stock)}</small>
              </td>
              <td>
                <button
                  class="btn outline small"
                  type="button"
                  data-action="admin-inventory-open"
                  data-product-id="${escapeAttribute(row.product_id)}">
                  ${en ? "Strategy" : "Estrategia"}
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function alp50RenderPagination()
{
  const totalPages = Math.max(1, Math.ceil(alp50InventoryState.count / alp50InventoryState.pageSize));
  if (totalPages <= 1) return "";

  const en = state.language === "en";
  const page = alp50InventoryState.page;

  return `
    <div class="alp50-pagination">
      <button
        type="button"
        class="btn outline small"
        data-action="admin-inventory-page"
        data-page="${Math.max(1, page - 1)}"
        ${page <= 1 ? "disabled" : ""}>
        ${en ? "Previous" : "Anterior"}
      </button>
      <span>${en ? "Page" : "Página"} ${page} / ${totalPages} · ${alp50Integer(alp50InventoryState.count)} ${en ? "products" : "productos"}</span>
      <button
        type="button"
        class="btn outline small"
        data-action="admin-inventory-page"
        data-page="${Math.min(totalPages, page + 1)}"
        ${page >= totalPages ? "disabled" : ""}>
        ${en ? "Next" : "Siguiente"}
      </button>
    </div>
  `;
}

function alp50SelectedRow()
{
  if (!alp50InventoryState.selectedId) return null;
  return alp50InventoryState.rows.find(row => Number(row.product_id) === Number(alp50InventoryState.selectedId)) || null;
}

function alp50RenderStrategyPanel()
{
  const row = alp50SelectedRow();
  if (!row) return "";

  const en = state.language === "en";

  return `
    <section class="alp50-strategy">
      <div class="alp50-section-head">
        <div>
          <p class="eyebrow">${en ? "Restock strategy" : "Estrategia de reposición"}</p>
          <h3>${escapeHtml(alp50Text(row.product_name))}</h3>
          <p>${escapeHtml(alp50Text(row.brand, en ? "No brand" : "Sin marca"))}</p>
        </div>
        <div class="alp50-head-actions">
          ${alp50StatusBadge(row.stock_status)}
          <button class="btn outline small" type="button" data-action="admin-inventory-close">${en ? "Close" : "Cerrar"}</button>
        </div>
      </div>

      <div class="alp50-strategy-metrics">
        ${alp50Kpi(en ? "Available stock" : "Stock disponible", alp50Decimal(row.available_equivalent_units, 2), en ? "Equivalent bottles" : "Botellas equivalentes")}
        ${alp50Kpi(en ? "Sales 30d" : "Ventas 30d", alp50Decimal(row.equivalent_units_30d, 2), alp50VelocityLabel(row.sales_velocity))}
        ${alp50Kpi(en ? "Coverage" : "Cobertura", row.estimated_days_of_stock == null ? "—" : `${alp50Decimal(row.estimated_days_of_stock, 1)} ${en ? "days" : "días"}`, en ? "At current pace" : "Al ritmo actual")}
        ${alp50Kpi(en ? "Suggested purchase" : "Compra sugerida", alp50Num(row.suggested_reorder_units, 0) > 0 ? `+${alp50Integer(row.suggested_reorder_units)}` : "0", alp50Money(row.estimated_restock_cost))}
      </div>

      <div class="alp50-strategy-grid">
        <label>
          <span>${en ? "Low stock threshold" : "Umbral de stock bajo"}</span>
          <input id="alp50LowStock" class="text-input" type="number" min="0" step="1" value="${escapeAttribute(alp50Num(row.low_stock_threshold, 2))}">
          <small>${en ? "Manual warning threshold." : "Umbral de advertencia manual."}</small>
        </label>

        <label>
          <span>${en ? "Manual restock target" : "Objetivo manual de stock"}</span>
          <input id="alp50RestockTarget" class="text-input" type="number" min="1" step="1" value="${escapeAttribute(alp50Num(row.restock_target, 5))}">
          <small>${en ? "Used when there is not enough recent sales history." : "Se usa cuando no hay suficiente historial reciente."}</small>
        </label>

        <label>
          <span>${en ? "Supplier lead time" : "Demora del proveedor"}</span>
          <div class="alp50-input-suffix"><input id="alp50LeadTime" class="text-input" type="number" min="1" step="1" value="${escapeAttribute(alp50Num(row.lead_time_days, 7))}"><span>${en ? "days" : "días"}</span></div>
          <small>${en ? "Estimated time until new stock arrives." : "Tiempo estimado hasta que llega la reposición."}</small>
        </label>

        <label>
          <span>${en ? "Safety stock" : "Stock de seguridad"}</span>
          <input id="alp50SafetyStock" class="text-input" type="number" min="0" step="1" value="${escapeAttribute(alp50Num(row.safety_stock_units, 1))}">
          <small>${en ? "Extra units reserved against demand spikes." : "Unidades extra para cubrir picos de demanda."}</small>
        </label>

        <label>
          <span>${en ? "Target coverage" : "Cobertura objetivo"}</span>
          <div class="alp50-input-suffix"><input id="alp50Coverage" class="text-input" type="number" min="7" step="1" value="${escapeAttribute(alp50Num(row.target_coverage_days, 45))}"><span>${en ? "days" : "días"}</span></div>
          <small>${en ? "How many days of stock you want after restocking." : "Cuántos días querés cubrir después de reponer."}</small>
        </label>

        <label>
          <span>${en ? "Dead-stock threshold" : "Días para considerar inmovilizado"}</span>
          <div class="alp50-input-suffix"><input id="alp50ImmobilizedDays" class="text-input" type="number" min="15" step="1" value="${escapeAttribute(alp50Num(row.immobilized_days, 90))}"><span>${en ? "days" : "días"}</span></div>
          <small>${en ? "Without a sale after this time, the product is flagged." : "Sin ventas durante este período, el producto se marca."}</small>
        </label>
      </div>

      <label class="alp50-switch-row">
        <input id="alp50ReorderEnabled" type="checkbox" ${row.reorder_enabled ? "checked" : ""}>
        <span>
          <strong>${en ? "Enable restock recommendations" : "Activar recomendaciones de reposición"}</strong>
          <small>${en ? "This never buys automatically; it only generates recommendations." : "Esto nunca compra automáticamente; solo genera recomendaciones."}</small>
        </span>
      </label>

      <div class="alp50-strategy-footer">
        <div>
          <small>${en ? "Last sale" : "Última venta"}</small>
          <strong>${escapeHtml(alp50Date(row.last_sale_at))}</strong>
        </div>
        <div>
          <small>${en ? "Unit cost" : "Costo unitario"}</small>
          <strong>${alp50Money(row.unit_cost)}</strong>
        </div>
        <div>
          <small>${en ? "Capital in closed stock" : "Capital en stock cerrado"}</small>
          <strong>${alp50Money(row.capital_in_closed_stock)}</strong>
        </div>
        <button
          class="btn"
          type="button"
          data-action="admin-inventory-save-strategy"
          data-product-id="${escapeAttribute(row.product_id)}"
          ${alp50InventoryState.saving ? "disabled" : ""}>
          ${alp50InventoryState.saving ? (en ? "Saving..." : "Guardando...") : (en ? "Save strategy" : "Guardar estrategia")}
        </button>
      </div>
    </section>
  `;
}

function renderAdminInventoryV2()
{
  const en = state.language === "en";

  if (alp50InventoryState.loading && !alp50InventoryState.loaded)
  {
    return `
      <div class="alp50-loading">
        <div class="spinner"></div>
        <strong>${en ? "Analyzing inventory..." : "Analizando inventario..."}</strong>
        <span>${en ? "Sales pace, coverage and restock plan." : "Velocidad de venta, cobertura y reposición."}</span>
      </div>
    `;
  }

  if (alp50InventoryState.error)
  {
    return `
      <div class="admin-message error">
        <strong>${en ? "Inventory could not be loaded." : "No se pudo cargar Inventario V2."}</strong><br>
        ${escapeHtml(alp50InventoryState.error)}
        <div class="u-mt-16">
          <button class="btn" type="button" data-action="admin-inventory-refresh">${en ? "Try again" : "Reintentar"}</button>
        </div>
      </div>
    `;
  }

  const summary = alp50Summary();

  return `
    <div class="alp50-inventory-shell">
      <div class="alp50-section-head">
        <div>
          <p class="eyebrow">AromaLParfum · Admin V2</p>
          <h2>${en ? "Smart inventory" : "Inventario inteligente"}</h2>
          <p>${en
            ? "See what is running out, what is not moving and how much to buy according to real sales pace."
            : "Mirá qué se está agotando, qué no rota y cuánto conviene comprar según el ritmo real de ventas."
          }</p>
        </div>
        <button class="btn outline" type="button" data-action="admin-inventory-refresh">${en ? "Refresh" : "Actualizar"}</button>
      </div>

      <div class="alp50-kpis">
        ${alp50Kpi(en ? "Products" : "Productos", alp50Integer(summary.products), en ? "Tracked" : "Monitoreados")}
        ${alp50Kpi(en ? "Out of stock" : "Sin stock", alp50Integer(summary.out_of_stock), en ? "Immediate attention" : "Atención inmediata", "is-danger")}
        ${alp50Kpi(en ? "Need restock" : "Reponer", alp50Integer(summary.need_restock), en ? "By sales pace" : "Por ritmo de venta", "is-warning")}
        ${alp50Kpi(en ? "Low stock" : "Stock bajo", alp50Integer(summary.low_stock), en ? "Manual threshold" : "Umbral manual", "is-warning")}
        ${alp50Kpi(en ? "Dead stock" : "Inmovilizados", alp50Integer(summary.immobilized), en ? "No recent sales" : "Sin ventas recientes", "is-muted")}
        ${alp50Kpi(en ? "Suggested purchase" : "Reposición sugerida", alp50Money(summary.estimated_restock_cost), en ? "Known supplier costs only" : "Solo costos conocidos", "is-money")}
        ${alp50Kpi(en ? "Dead-stock capital" : "Capital inmovilizado", alp50Money(alp50InventoryState.immobilizedCapital), en ? "Known costs only" : "Solo costos cargados", "is-muted")}
      </div>

      ${alp50RenderStrategyPanel()}

      <div class="alp50-grid-two">
        <section class="alp50-card">
          <div class="alp50-card-head">
            <div>
              <small>${en ? "PURCHASE PRIORITY" : "PRIORIDAD DE COMPRA"}</small>
              <h3>${en ? "Suggested restock" : "Reposición sugerida"}</h3>
            </div>
            <span>${alp50Money(summary.estimated_restock_cost)}</span>
          </div>
          ${alp50RenderRestockPlan()}
          <p class="alp50-note">${en
            ? "Dead-stock products are intentionally excluded from purchase suggestions."
            : "Los productos inmovilizados se excluyen a propósito de las sugerencias de compra."
          }</p>
        </section>

        <section class="alp50-card">
          <div class="alp50-card-head">
            <div>
              <small>${en ? "HOW IT WORKS" : "CÓMO DECIDE"}</small>
              <h3>${en ? "Restock logic" : "Lógica de reposición"}</h3>
            </div>
          </div>
          <div class="alp50-rules">
            <div><span>01</span><p><strong>${en ? "Sales pace" : "Velocidad de venta"}</strong><small>${en ? "Uses equivalent bottles sold over 30 and 90 days." : "Usa botellas equivalentes vendidas en 30 y 90 días."}</small></p></div>
            <div><span>02</span><p><strong>${en ? "Real coverage" : "Cobertura real"}</strong><small>${en ? "Closed bottles plus open decant liquid." : "Botellas cerradas más líquido abierto para decants."}</small></p></div>
            <div><span>03</span><p><strong>${en ? "Lead time + safety" : "Demora + seguridad"}</strong><small>${en ? "Anticipates supplier delay and keeps safety units." : "Anticipa la demora del proveedor y conserva stock de seguridad."}</small></p></div>
            <div><span>04</span><p><strong>${en ? "Dead stock brake" : "Freno a inmovilizados"}</strong><small>${en ? "A product without sales is not recommended just because stock is low." : "Un producto sin ventas no se recomienda solo porque tenga poco stock."}</small></p></div>
          </div>
          <div class="alp50-safe-note">${en
            ? "Automatic purchasing is disabled. AromaLParfum only receives a recommendation; you decide whether to buy."
            : "La compra automática está desactivada. AromaLParfum solo recibe una recomendación; vos decidís si comprás."
          }</div>
        </section>
      </div>

      <section class="alp50-card">
        <div class="alp50-card-head alp50-card-head-wrap">
          <div>
            <small>${en ? "ALL INVENTORY" : "TODO EL INVENTARIO"}</small>
            <h3>${en ? "Products and coverage" : "Productos y cobertura"}</h3>
          </div>
          <span>${alp50Integer(alp50InventoryState.count)} ${en ? "results" : "resultados"}</span>
        </div>

        <div class="alp50-filters">
          <label class="alp50-search-field">
            <span>${en ? "Search" : "Buscar"}</span>
            <input id="alp50InventorySearch" class="text-input" type="search" value="${escapeAttribute(alp50InventoryState.query)}" placeholder="${en ? "Product or brand" : "Producto o marca"}">
          </label>

          <label>
            <span>${en ? "Status" : "Estado"}</span>
            <select id="alp50InventoryStatus" class="text-input">
              <option value="all" ${alp50InventoryState.status === "all" ? "selected" : ""}>${en ? "All" : "Todos"}</option>
              <option value="sin_stock" ${alp50InventoryState.status === "sin_stock" ? "selected" : ""}>${en ? "Out of stock" : "Sin stock"}</option>
              <option value="reponer" ${alp50InventoryState.status === "reponer" ? "selected" : ""}>${en ? "Restock" : "Reponer"}</option>
              <option value="stock_bajo" ${alp50InventoryState.status === "stock_bajo" ? "selected" : ""}>${en ? "Low stock" : "Stock bajo"}</option>
              <option value="inmovilizado" ${alp50InventoryState.status === "inmovilizado" ? "selected" : ""}>${en ? "Dead stock" : "Inmovilizado"}</option>
              <option value="saludable" ${alp50InventoryState.status === "saludable" ? "selected" : ""}>${en ? "Healthy" : "Saludable"}</option>
            </select>
          </label>

          <label>
            <span>${en ? "Velocity" : "Velocidad"}</span>
            <select id="alp50InventoryVelocity" class="text-input">
              <option value="all" ${alp50InventoryState.velocity === "all" ? "selected" : ""}>${en ? "All" : "Todas"}</option>
              <option value="muy_alta" ${alp50InventoryState.velocity === "muy_alta" ? "selected" : ""}>${en ? "Very high" : "Muy alta"}</option>
              <option value="alta" ${alp50InventoryState.velocity === "alta" ? "selected" : ""}>${en ? "High" : "Alta"}</option>
              <option value="media" ${alp50InventoryState.velocity === "media" ? "selected" : ""}>${en ? "Medium" : "Media"}</option>
              <option value="baja" ${alp50InventoryState.velocity === "baja" ? "selected" : ""}>${en ? "Low" : "Baja"}</option>
              <option value="sin_ventas" ${alp50InventoryState.velocity === "sin_ventas" ? "selected" : ""}>${en ? "No sales" : "Sin ventas"}</option>
            </select>
          </label>

          <div class="alp50-filter-actions">
            <button class="btn" type="button" data-action="admin-inventory-apply-filters">${en ? "Apply" : "Aplicar"}</button>
            <button class="btn outline" type="button" data-action="admin-inventory-reset-filters">${en ? "Clear" : "Limpiar"}</button>
          </div>
        </div>

        ${alp50RenderTable()}
        ${alp50RenderPagination()}

        <p class="alp50-note">${en
          ? "Money figures only include products with a supplier cost loaded. Open decant liquid is converted into bottle-equivalent stock."
          : "Los importes solo incluyen productos con costo de proveedor cargado. El líquido abierto de decants se convierte a stock equivalente."
        }</p>
      </section>
    </div>
  `;
}

async function alp50ApplyFilters()
{
  alp50InventoryState.query = document.getElementById("alp50InventorySearch")?.value?.trim() || "";
  alp50InventoryState.status = document.getElementById("alp50InventoryStatus")?.value || "all";
  alp50InventoryState.velocity = document.getElementById("alp50InventoryVelocity")?.value || "all";
  alp50InventoryState.page = 1;
  alp50InventoryState.selectedId = null;
  alp50InventoryState.loaded = false;
  await alp50LoadInventory({ force: true });
}

async function alp50ResetFilters()
{
  alp50InventoryState.query = "";
  alp50InventoryState.status = "all";
  alp50InventoryState.velocity = "all";
  alp50InventoryState.page = 1;
  alp50InventoryState.selectedId = null;
  alp50InventoryState.loaded = false;
  await alp50LoadInventory({ force: true });
}

async function alp50SetPage(page)
{
  const totalPages = Math.max(1, Math.ceil(alp50InventoryState.count / alp50InventoryState.pageSize));
  alp50InventoryState.page = Math.max(1, Math.min(totalPages, Number(page) || 1));
  alp50InventoryState.selectedId = null;
  alp50InventoryState.loaded = false;
  await alp50LoadInventory({ force: true });
}

function alp50OpenStrategy(productId)
{
  const id = Number(productId);
  const row = alp50InventoryState.rows.find(item => Number(item.product_id) === id);
  if (!row)
  {
    toast(state.language === "en" ? "Product not available on this page." : "Ese producto no está disponible en esta página.", "error");
    return;
  }

  alp50InventoryState.selectedId = id;
  alp50RenderIntoHost();
  requestAnimationFrame(() => document.querySelector(".alp50-strategy")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function alp50CloseStrategy()
{
  alp50InventoryState.selectedId = null;
  alp50RenderIntoHost();
}

function alp50ReadPositiveInt(id, minimum)
{
  const value = Number(document.getElementById(id)?.value);
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.round(value));
}

async function alp50SaveStrategy(productId)
{
  if (alp50InventoryState.saving) return;

  const id = Number(productId || alp50InventoryState.selectedId);
  if (!id) return;

  alp50InventoryState.saving = true;
  alp50RenderIntoHost();

  try
  {
    const result = await supabaseClient.rpc("admin_update_inventory_strategy", {
      p_product_id: id,
      p_low_stock_threshold: alp50ReadPositiveInt("alp50LowStock", 0),
      p_restock_target: alp50ReadPositiveInt("alp50RestockTarget", 1),
      p_lead_time_days: alp50ReadPositiveInt("alp50LeadTime", 1),
      p_safety_stock_units: alp50ReadPositiveInt("alp50SafetyStock", 0),
      p_target_coverage_days: alp50ReadPositiveInt("alp50Coverage", 7),
      p_immobilized_days: alp50ReadPositiveInt("alp50ImmobilizedDays", 15),
      p_reorder_enabled: Boolean(document.getElementById("alp50ReorderEnabled")?.checked),
    });

    if (result.error) throw result.error;

    toast(state.language === "en" ? "Inventory strategy saved." : "Estrategia de inventario guardada.", "ok");

    alp50InventoryState.loaded = false;
    await alp50LoadInventory({ force: true });
    alp50InventoryState.selectedId = id;
    alp50RenderIntoHost();

    if (typeof alp48DashboardState === "object")
    {
      alp48DashboardState.loaded = false;
    }
  }
  catch (error)
  {
    console.error("PASO50 save strategy:", error);
    toast(error?.message || String(error), "error");
  }
  finally
  {
    alp50InventoryState.saving = false;
    alp50RenderIntoHost();
  }
}

window.renderAdminInventoryV2 = renderAdminInventoryV2;
window.alp50EnsureInventoryLoaded = alp50EnsureInventoryLoaded;
window.alp50LoadInventory = alp50LoadInventory;
window.alp50ApplyFilters = alp50ApplyFilters;
window.alp50ResetFilters = alp50ResetFilters;
window.alp50SetPage = alp50SetPage;
window.alp50OpenStrategy = alp50OpenStrategy;
window.alp50CloseStrategy = alp50CloseStrategy;
window.alp50SaveStrategy = alp50SaveStrategy;
