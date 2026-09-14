"use strict";

// =========================================================
// AromaLParfum — PASO 51
// Finanzas V2 (solo Admin)
// Costos + margen + precio mínimo seguro + promociones
// =========================================================

const ALP51_PAGE_SIZE = 20;

const alp51FinanceState = {
  loaded: false,
  loading: false,
  saving: false,
  error: "",
  rows: [],
  filtered: [],
  promotions: [],
  query: "",
  status: "all",
  page: 1,
  pageSize: ALP51_PAGE_SIZE,
  selectedId: null,
  financeConfig: null,
};

window.alp51FinanceState = alp51FinanceState;

function alp51Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp51MaybeNum(value)
{
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function alp51Money(value)
{
  if (value === null || value === undefined || value === "") return "—";
  return formatMoney(alp51Num(value, 0));
}

function alp51Percent(value)
{
  if (value === null || value === undefined || value === "") return "—";
  return `${new Intl.NumberFormat(state.language === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 1 }).format(alp51Num(value, 0))}%`;
}

function alp51Pick(row, names, fallback = null)
{
  for (const name of names)
  {
    if (row && row[name] !== undefined && row[name] !== null) return row[name];
  }
  return fallback;
}

function alp51GetFinanceConfig()
{
  const existing = typeof getSiteSettingObject === "function"
    ? getSiteSettingObject("finance")
    : null;

  const cfg = existing && typeof existing === "object" ? existing : {};
  return {
    minimumMarginPercent: alp51Num(
      cfg.minimum_margin_percent ?? cfg.min_margin_percent ?? cfg.minimumMarginPercent,
      25
    ),
    warningMarginPercent: alp51Num(
      cfg.warning_margin_percent ?? cfg.margin_warning_percent ?? cfg.warningMarginPercent,
      30
    ),
    maxPromotionDiscountPercent: alp51Num(
      cfg.max_promotion_discount_percent ?? cfg.promo_limit_percent ?? cfg.maxPromotionDiscountPercent,
      20
    ),
  };
}

function alp51NormalizeProductRow(row)
{
  const cfg = alp51FinanceState.financeConfig || alp51GetFinanceConfig();
  const id = alp51Pick(row, ["product_id", "id"]);
  const name = String(alp51Pick(row, ["product_name", "nombre", "name"], "Producto"));
  const brand = String(alp51Pick(row, ["brand", "marca"], "") || "");
  const price = alp51MaybeNum(alp51Pick(row, ["sale_price", "current_price", "precio", "price"]));
  const cost = alp51MaybeNum(alp51Pick(row, ["unit_cost", "cost", "costo", "current_cost"]));

  const profitFromView = alp51MaybeNum(alp51Pick(row, ["estimated_profit", "gross_profit", "profit", "ganancia"]));
  const marginFromView = alp51MaybeNum(alp51Pick(row, ["margin_percent", "margin_percentage", "margen_porcentaje", "margin"]));
  const minSafeFromView = alp51MaybeNum(alp51Pick(row, ["minimum_safe_price", "min_safe_price", "precio_minimo_seguro"]));

  const profit = profitFromView !== null
    ? profitFromView
    : (price !== null && cost !== null ? price - cost : null);

  const margin = marginFromView !== null
    ? marginFromView
    : (price !== null && price > 0 && cost !== null ? ((price - cost) / price) * 100 : null);

  const minimumSafePrice = minSafeFromView !== null
    ? minSafeFromView
    : (cost !== null && cfg.minimumMarginPercent < 100
      ? cost / (1 - cfg.minimumMarginPercent / 100)
      : null);

  let status = String(alp51Pick(row, ["financial_status", "margin_status", "status"], "") || "").toLowerCase();
  if (!status)
  {
    if (cost === null) status = "sin_costo";
    else if (profit !== null && profit < 0) status = "perdida";
    else if (margin !== null && margin < cfg.minimumMarginPercent) status = "peligro";
    else if (margin !== null && margin < cfg.warningMarginPercent) status = "advertencia";
    else status = "saludable";
  }

  if (["costos_incompletos", "missing_cost", "sin_costos"].includes(status)) status = "sin_costo";
  if (["margen_bajo", "low_margin", "riesgo"].includes(status)) status = "peligro";
  if (["healthy", "ok"].includes(status)) status = "saludable";
  if (["loss", "negative"].includes(status)) status = "perdida";

  return {
    raw: row,
    id: Number(id),
    name,
    brand,
    price,
    cost,
    profit,
    margin,
    minimumSafePrice,
    status,
  };
}

function alp51NormalizePromotionRow(row)
{
  const currentPrice = alp51MaybeNum(alp51Pick(row, ["current_price", "sale_price", "precio_actual", "product_price"]));
  const promoPrice = alp51MaybeNum(alp51Pick(row, ["promo_price", "promotional_price", "precio_promocional", "final_price"]));
  const cost = alp51MaybeNum(alp51Pick(row, ["cost", "costo", "unit_cost"]));
  const profit = alp51MaybeNum(alp51Pick(row, ["promo_profit", "profit_after_promo", "estimated_profit", "ganancia_promocion"]));
  const margin = alp51MaybeNum(alp51Pick(row, ["promo_margin_percent", "margin_after_promo", "margin_percent", "margen_promocion"]));

  return {
    id: alp51Pick(row, ["promotion_id", "id"]),
    productId: alp51Pick(row, ["product_id"]),
    promotionName: String(alp51Pick(row, ["promotion_name", "nombre_promocion", "nombre", "name"], "Promoción")),
    productName: String(alp51Pick(row, ["product_name", "nombre_producto"], "") || ""),
    type: String(alp51Pick(row, ["promotion_type", "type", "tipo"], "") || ""),
    value: alp51Pick(row, ["promotion_value", "discount_value", "valor"]),
    currentPrice,
    promoPrice,
    cost,
    profit: profit !== null ? profit : (promoPrice !== null && cost !== null ? promoPrice - cost : null),
    margin: margin !== null ? margin : (promoPrice !== null && promoPrice > 0 && cost !== null ? ((promoPrice - cost) / promoPrice) * 100 : null),
    status: String(alp51Pick(row, ["financial_status", "status", "impact_status"], "") || "").toLowerCase(),
    active: Boolean(alp51Pick(row, ["active", "activo"], false)),
  };
}

function alp51ApplyLocalFilters()
{
  const q = alp51FinanceState.query.trim().toLowerCase();
  alp51FinanceState.filtered = alp51FinanceState.rows.filter(row =>
  {
    const matchesQuery = !q || `${row.name} ${row.brand}`.toLowerCase().includes(q);
    const matchesStatus = alp51FinanceState.status === "all" || row.status === alp51FinanceState.status;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(alp51FinanceState.filtered.length / alp51FinanceState.pageSize));
  if (alp51FinanceState.page > totalPages) alp51FinanceState.page = totalPages;
}

async function alp51LoadFinance({ force = false } = {})
{
  if (alp51FinanceState.loading) return;
  if (alp51FinanceState.loaded && !force)
  {
    alp51RenderIntoHost();
    return;
  }

  alp51FinanceState.loading = true;
  alp51FinanceState.error = "";
  alp51RenderIntoHost();

  try
  {
    if (typeof loadSiteSettings === "function") await loadSiteSettings();
    alp51FinanceState.financeConfig = alp51GetFinanceConfig();

    const [productsResult, promosResult] = await Promise.all([
      supabaseClient.from("admin_product_financials").select("*"),
      supabaseClient.from("admin_promotion_impact").select("*"),
    ]);

    if (productsResult.error) throw productsResult.error;
    if (promosResult.error)
    {
      console.warn("PASO51 admin_promotion_impact:", promosResult.error.message);
    }

    alp51FinanceState.rows = (Array.isArray(productsResult.data) ? productsResult.data : [])
      .map(alp51NormalizeProductRow)
      .filter(row => Number.isFinite(row.id));

    alp51FinanceState.promotions = (Array.isArray(promosResult.data) ? promosResult.data : [])
      .map(alp51NormalizePromotionRow);

    alp51FinanceState.loaded = true;
    alp51ApplyLocalFilters();
  }
  catch (error)
  {
    console.error("PASO51 finance:", error);
    alp51FinanceState.error = error?.message || String(error);
  }
  finally
  {
    alp51FinanceState.loading = false;
    alp51RenderIntoHost();
  }
}

function alp51EnsureFinanceLoaded()
{
  if (!alp51FinanceState.loaded && !alp51FinanceState.loading)
  {
    alp51LoadFinance();
  }
}

function alp51RenderIntoHost()
{
  if (state.admin.tab !== "finance") return;
  const host = document.getElementById("adminTabContent");
  if (host) host.innerHTML = renderAdminFinanceV2();
}

function alp51StatusLabel(status)
{
  const en = state.language === "en";
  const es = {
    saludable: "Saludable",
    advertencia: "Advertencia",
    peligro: "Margen bajo",
    perdida: "Pérdida",
    sin_costo: "Sin costo",
  };
  const eng = {
    saludable: "Healthy",
    advertencia: "Warning",
    peligro: "Low margin",
    perdida: "Loss",
    sin_costo: "Missing cost",
  };
  return (en ? eng : es)[status] || status || (en ? "Unknown" : "Sin clasificar");
}

function alp51StatusBadge(status)
{
  const safe = ["saludable", "advertencia", "peligro", "perdida", "sin_costo"].includes(status) ? status : "sin_costo";
  return `<span class="alp51-badge is-${escapeAttribute(safe)}">${escapeHtml(alp51StatusLabel(safe))}</span>`;
}

function alp51Stats()
{
  const rows = alp51FinanceState.rows;
  const withCost = rows.filter(r => r.cost !== null);
  const totalKnownProfit = withCost.reduce((sum, r) => sum + alp51Num(r.profit, 0), 0);
  const avgMargin = withCost.length
    ? withCost.reduce((sum, r) => sum + alp51Num(r.margin, 0), 0) / withCost.length
    : 0;

  return {
    products: rows.length,
    missingCost: rows.filter(r => r.cost === null).length,
    lowMargin: rows.filter(r => ["peligro", "perdida"].includes(r.status)).length,
    warning: rows.filter(r => r.status === "advertencia").length,
    healthy: rows.filter(r => r.status === "saludable").length,
    totalKnownProfit,
    avgMargin,
  };
}

function alp51Kpi(label, value, note = "", cls = "")
{
  return `<article class="alp51-kpi ${escapeAttribute(cls)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</article>`;
}

function alp51CurrentPageRows()
{
  const start = (alp51FinanceState.page - 1) * alp51FinanceState.pageSize;
  return alp51FinanceState.filtered.slice(start, start + alp51FinanceState.pageSize);
}

function alp51RenderProductsTable()
{
  const en = state.language === "en";
  const rows = alp51CurrentPageRows();
  if (!rows.length)
  {
    return `<div class="alp51-empty"><strong>${en ? "No products found" : "No encontramos productos"}</strong><span>${en ? "Change the search or margin filter." : "Cambiá la búsqueda o el filtro de margen."}</span></div>`;
  }

  return `
    <div class="admin-table-wrap alp51-table-wrap">
      <table class="admin-table alp51-table">
        <thead><tr>
          <th>${en ? "Product" : "Producto"}</th>
          <th>${en ? "Sale price" : "Precio venta"}</th>
          <th>${en ? "Cost" : "Costo"}</th>
          <th>${en ? "Profit" : "Ganancia"}</th>
          <th>${en ? "Margin" : "Margen"}</th>
          <th>${en ? "Minimum safe price" : "Precio mínimo seguro"}</th>
          <th>${en ? "Status" : "Estado"}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.brand || (en ? "No brand" : "Sin marca"))}</small></td>
              <td><strong>${alp51Money(row.price)}</strong></td>
              <td><strong>${alp51Money(row.cost)}</strong></td>
              <td><strong>${alp51Money(row.profit)}</strong></td>
              <td><strong>${alp51Percent(row.margin)}</strong></td>
              <td><strong>${alp51Money(row.minimumSafePrice)}</strong><small>${en ? "Based on minimum configured margin" : "Según margen mínimo configurado"}</small></td>
              <td>${alp51StatusBadge(row.status)}</td>
              <td><button class="btn outline small" type="button" data-action="admin-finance-edit-cost" data-product-id="${escapeAttribute(row.id)}">${en ? "Cost" : "Costo"}</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function alp51RenderPagination()
{
  const en = state.language === "en";
  const totalPages = Math.max(1, Math.ceil(alp51FinanceState.filtered.length / alp51FinanceState.pageSize));
  if (totalPages <= 1) return "";
  return `<div class="alp51-pagination">
    <button class="btn outline small" type="button" data-action="admin-finance-page" data-page="${Math.max(1, alp51FinanceState.page - 1)}" ${alp51FinanceState.page <= 1 ? "disabled" : ""}>${en ? "Previous" : "Anterior"}</button>
    <span>${en ? "Page" : "Página"} ${alp51FinanceState.page} / ${totalPages} · ${alp51FinanceState.filtered.length}</span>
    <button class="btn outline small" type="button" data-action="admin-finance-page" data-page="${Math.min(totalPages, alp51FinanceState.page + 1)}" ${alp51FinanceState.page >= totalPages ? "disabled" : ""}>${en ? "Next" : "Siguiente"}</button>
  </div>`;
}

function alp51RenderPromotionImpact()
{
  const en = state.language === "en";
  const rows = alp51FinanceState.promotions.slice(0, 30);
  if (!rows.length)
  {
    return `<div class="alp51-empty is-soft"><strong>${en ? "No promotion impact to show" : "Sin impacto de promociones para mostrar"}</strong><span>${en ? "When promotions are configured, their margin impact will appear here." : "Cuando configures promociones, acá vas a ver cómo afectan el margen."}</span></div>`;
  }

  return `<div class="admin-table-wrap alp51-table-wrap"><table class="admin-table alp51-promo-table"><thead><tr>
    <th>${en ? "Promotion" : "Promoción"}</th><th>${en ? "Product" : "Producto"}</th><th>${en ? "Normal" : "Normal"}</th><th>${en ? "Promo" : "Promo"}</th><th>${en ? "Profit" : "Ganancia"}</th><th>${en ? "Margin" : "Margen"}</th>
  </tr></thead><tbody>${rows.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.promotionName)}</strong><small>${escapeHtml(row.type || "—")}</small></td>
      <td>${escapeHtml(row.productName || "—")}</td>
      <td>${alp51Money(row.currentPrice)}</td>
      <td><strong>${alp51Money(row.promoPrice)}</strong></td>
      <td>${alp51Money(row.profit)}</td>
      <td>${alp51Percent(row.margin)}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function alp51SelectedRow()
{
  return alp51FinanceState.rows.find(row => Number(row.id) === Number(alp51FinanceState.selectedId)) || null;
}

function alp51RenderCostEditor()
{
  const row = alp51SelectedRow();
  if (!row) return "";
  const en = state.language === "en";
  const cfg = alp51FinanceState.financeConfig || alp51GetFinanceConfig();

  return `<section class="alp51-cost-editor">
    <div class="alp51-section-head">
      <div><p class="eyebrow">${en ? "Supplier cost" : "Costo proveedor"}</p><h3>${escapeHtml(row.name)}</h3><p>${escapeHtml(row.brand || (en ? "No brand" : "Sin marca"))}</p></div>
      <button class="btn outline small" type="button" data-action="admin-finance-close-cost">${en ? "Close" : "Cerrar"}</button>
    </div>
    <div class="alp51-cost-grid">
      <label><span>${en ? "Current sale price" : "Precio de venta actual"}</span><strong>${alp51Money(row.price)}</strong></label>
      <label><span>${en ? "Supplier / real cost" : "Costo proveedor / real"}</span><input id="alp51CostInput" class="text-input" type="number" min="0" step="0.01" value="${escapeAttribute(row.cost ?? "")}" placeholder="0"></label>
      <label><span>${en ? "Minimum target margin" : "Margen mínimo objetivo"}</span><strong>${alp51Percent(cfg.minimumMarginPercent)}</strong></label>
      <label><span>${en ? "Safe price with this cost" : "Precio seguro con este costo"}</span><strong id="alp51SafePreview">${alp51Money(row.minimumSafePrice)}</strong></label>
    </div>
    <p class="alp51-note">${en ? "The cost is private and never sent to the public store. Updating it recalculates financial views and margin alerts." : "El costo es privado y nunca se envía a la tienda pública. Al actualizarlo se recalculan las vistas financieras y las alertas de margen."}</p>
    <div><button class="btn" type="button" data-action="admin-finance-save-cost" data-product-id="${escapeAttribute(row.id)}" ${alp51FinanceState.saving ? "disabled" : ""}>${alp51FinanceState.saving ? (en ? "Saving..." : "Guardando...") : (en ? "Save cost" : "Guardar costo")}</button></div>
  </section>`;
}

function renderAdminFinanceV2()
{
  const en = state.language === "en";

  if (alp51FinanceState.loading && !alp51FinanceState.loaded)
  {
    return `<div class="alp51-loading"><div class="spinner"></div><strong>${en ? "Analyzing margins..." : "Analizando márgenes..."}</strong><span>${en ? "Costs, prices and promotions." : "Costos, precios y promociones."}</span></div>`;
  }

  if (alp51FinanceState.error)
  {
    return `<div class="admin-message error"><strong>${en ? "Finance V2 could not be loaded." : "No se pudo cargar Finanzas V2."}</strong><br>${escapeHtml(alp51FinanceState.error)}<div class="u-mt-16"><button class="btn" type="button" data-action="admin-finance-refresh">${en ? "Try again" : "Reintentar"}</button></div></div>`;
  }

  const stats = alp51Stats();
  const cfg = alp51FinanceState.financeConfig || alp51GetFinanceConfig();

  return `<div class="alp51-finance-shell">
    <div class="alp51-section-head">
      <div><p class="eyebrow">AromaLParfum · Admin V2</p><h2>${en ? "Finance & margins" : "Finanzas y márgenes"}</h2><p>${en ? "Control real costs, margin per fragrance, safe minimum price and promotion impact." : "Controlá costos reales, margen por perfume, precio mínimo seguro e impacto de promociones."}</p></div>
      <button class="btn outline" type="button" data-action="admin-finance-refresh">${en ? "Refresh" : "Actualizar"}</button>
    </div>

    <div class="alp51-kpis">
      ${alp51Kpi(en ? "Products" : "Productos", String(stats.products), en ? "Financially tracked" : "Control financiero")}
      ${alp51Kpi(en ? "Missing cost" : "Sin costo", String(stats.missingCost), en ? "Profit cannot be trusted" : "No se puede calcular ganancia", stats.missingCost ? "is-danger" : "")}
      ${alp51Kpi(en ? "Low margin / loss" : "Margen bajo / pérdida", String(stats.lowMargin), en ? "Needs review" : "Requieren revisión", stats.lowMargin ? "is-danger" : "")}
      ${alp51Kpi(en ? "Warnings" : "Advertencias", String(stats.warning), en ? "Near the minimum" : "Cerca del mínimo", stats.warning ? "is-warning" : "")}
      ${alp51Kpi(en ? "Healthy" : "Saludables", String(stats.healthy), en ? "Above target" : "Por encima del objetivo", "is-good")}
      ${alp51Kpi(en ? "Average known margin" : "Margen promedio conocido", alp51Percent(stats.avgMargin), `${en ? "Minimum" : "Mínimo"}: ${alp51Percent(cfg.minimumMarginPercent)}`, "is-money")}
    </div>

    <section class="alp51-card alp51-policy-card">
      <div><small>${en ? "FINANCIAL POLICY" : "POLÍTICA FINANCIERA"}</small><strong>${en ? "Minimum margin" : "Margen mínimo"} ${alp51Percent(cfg.minimumMarginPercent)}</strong></div>
      <div><small>${en ? "WARNING" : "ADVERTENCIA"}</small><strong>${alp51Percent(cfg.warningMarginPercent)}</strong></div>
      <div><small>${en ? "PROMO LIMIT" : "LÍMITE PROMO"}</small><strong>${alp51Percent(cfg.maxPromotionDiscountPercent)}</strong></div>
      <p>${en ? "If a cost is missing, the dashboard does not invent profit. Safe price is calculated from the minimum configured margin." : "Si falta un costo, el panel no inventa ganancia. El precio seguro se calcula según el margen mínimo configurado."}</p>
    </section>

    ${alp51RenderCostEditor()}

    <section class="alp51-card">
      <div class="alp51-card-head"><div><small>${en ? "PRODUCT MARGINS" : "MÁRGENES POR PRODUCTO"}</small><h3>${en ? "Profitability control" : "Control de rentabilidad"}</h3></div><span>${alp51FinanceState.filtered.length} ${en ? "results" : "resultados"}</span></div>
      <div class="alp51-filters">
        <label><span>${en ? "Search" : "Buscar"}</span><input id="alp51Search" class="text-input" value="${escapeAttribute(alp51FinanceState.query)}" placeholder="${en ? "Product or brand" : "Producto o marca"}"></label>
        <label><span>${en ? "Margin status" : "Estado de margen"}</span><select id="alp51Status" class="text-input">
          <option value="all" ${alp51FinanceState.status === "all" ? "selected" : ""}>${en ? "All" : "Todos"}</option>
          <option value="saludable" ${alp51FinanceState.status === "saludable" ? "selected" : ""}>${en ? "Healthy" : "Saludable"}</option>
          <option value="advertencia" ${alp51FinanceState.status === "advertencia" ? "selected" : ""}>${en ? "Warning" : "Advertencia"}</option>
          <option value="peligro" ${alp51FinanceState.status === "peligro" ? "selected" : ""}>${en ? "Low margin" : "Margen bajo"}</option>
          <option value="perdida" ${alp51FinanceState.status === "perdida" ? "selected" : ""}>${en ? "Loss" : "Pérdida"}</option>
          <option value="sin_costo" ${alp51FinanceState.status === "sin_costo" ? "selected" : ""}>${en ? "Missing cost" : "Sin costo"}</option>
        </select></label>
        <div class="alp51-filter-actions"><button class="btn" type="button" data-action="admin-finance-apply-filters">${en ? "Apply" : "Aplicar"}</button><button class="btn outline" type="button" data-action="admin-finance-reset-filters">${en ? "Reset" : "Restablecer"}</button></div>
      </div>
      ${alp51RenderProductsTable()}
      ${alp51RenderPagination()}
    </section>

    <section class="alp51-card">
      <div class="alp51-card-head"><div><small>${en ? "PROMOTIONS" : "PROMOCIONES"}</small><h3>${en ? "Impact on margin" : "Impacto sobre el margen"}</h3></div><span>${alp51FinanceState.promotions.length}</span></div>
      <p class="alp51-note">${en ? "A promotion should never be evaluated only by discount percentage: what matters is the resulting margin after cost." : "Una promoción no se evalúa solo por el porcentaje de descuento: importa el margen que queda después del costo."}</p>
      ${alp51RenderPromotionImpact()}
    </section>
  </div>`;
}

async function alp51ApplyFilters()
{
  alp51FinanceState.query = String(document.getElementById("alp51Search")?.value || "").trim().slice(0, 80);
  alp51FinanceState.status = String(document.getElementById("alp51Status")?.value || "all");
  alp51FinanceState.page = 1;
  alp51ApplyLocalFilters();
  alp51RenderIntoHost();
}

function alp51ResetFilters()
{
  alp51FinanceState.query = "";
  alp51FinanceState.status = "all";
  alp51FinanceState.page = 1;
  alp51ApplyLocalFilters();
  alp51RenderIntoHost();
}

function alp51SetPage(value)
{
  const totalPages = Math.max(1, Math.ceil(alp51FinanceState.filtered.length / alp51FinanceState.pageSize));
  alp51FinanceState.page = Math.min(totalPages, Math.max(1, Number(value) || 1));
  alp51RenderIntoHost();
}

function alp51OpenCostEditor(productId)
{
  alp51FinanceState.selectedId = Number(productId);
  alp51RenderIntoHost();
  queueMicrotask(() => document.getElementById("alp51CostInput")?.focus());
}

function alp51CloseCostEditor()
{
  alp51FinanceState.selectedId = null;
  alp51RenderIntoHost();
}

async function alp51SaveCost(productId)
{
  const en = state.language === "en";
  const value = document.getElementById("alp51CostInput")?.value;
  const cost = Number(value);

  if (!Number.isFinite(cost) || cost < 0)
  {
    adminMessage(en ? "Enter a valid non-negative cost." : "Ingresá un costo válido mayor o igual a cero.", "error");
    return;
  }

  alp51FinanceState.saving = true;
  alp51RenderIntoHost();

  try
  {
    const result = await supabaseClient
      .from("product_costs")
      .upsert({ product_id: Number(productId), costo: cost }, { onConflict: "product_id" });

    if (result.error) throw result.error;

    adminMessage(en ? "Cost updated." : "Costo actualizado.", "ok");
    alp51FinanceState.selectedId = null;
    alp51FinanceState.loaded = false;
    await alp51LoadFinance({ force: true });
  }
  catch (error)
  {
    console.error("PASO51 save cost:", error);
    adminMessage(error?.message || String(error), "error");
  }
  finally
  {
    alp51FinanceState.saving = false;
    alp51RenderIntoHost();
  }
}

window.renderAdminFinanceV2 = renderAdminFinanceV2;
window.alp51LoadFinance = alp51LoadFinance;
window.alp51EnsureFinanceLoaded = alp51EnsureFinanceLoaded;
window.alp51ApplyFilters = alp51ApplyFilters;
window.alp51ResetFilters = alp51ResetFilters;
window.alp51SetPage = alp51SetPage;
window.alp51OpenCostEditor = alp51OpenCostEditor;
window.alp51CloseCostEditor = alp51CloseCostEditor;
window.alp51SaveCost = alp51SaveCost;
