"use strict";

// =========================================================
// AromaLParfum — PASO 53
// Gift Sets + Discovery Boxes V2 (solo Admin)
// =========================================================

const alp53PackState = {
  loaded: false,
  loading: false,
  saving: false,
  error: "",
  section: "gift_sets",
  giftSets: [],
  giftSetProducts: [],
  discoveryBoxes: [],
  discoveryBoxProducts: [],
  giftFinancials: [],
  discoveryFinancials: [],
  decantSizes: [],
  editGiftSetId: null,
  editDiscoveryId: null,
};

window.alp53PackState = alp53PackState;

function alp53Escape(value) { return escapeHtml(String(value ?? "")); }
function alp53Attr(value) { return escapeAttribute(String(value ?? "")); }
function alp53Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function alp53MaybeNum(value)
{
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function alp53Slugify(value)
{
  return String(value || "pack")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pack";
}
function alp53Pick(row, names, fallback = null)
{
  for (const name of names)
  {
    if (row && row[name] !== undefined && row[name] !== null) return row[name];
  }
  return fallback;
}
function alp53Value(id)
{
  return String(document.getElementById(id)?.value ?? "").trim();
}
function alp53Checked(id)
{
  return Boolean(document.getElementById(id)?.checked);
}
function alp53Money(value)
{
  const n = alp53MaybeNum(value);
  return n === null ? "—" : formatMoney(n);
}
function alp53Percent(value)
{
  const n = alp53MaybeNum(value);
  if (n === null) return "—";
  return `${new Intl.NumberFormat(state.language === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 1 }).format(n)}%`;
}
function alp53GetProduct(productId)
{
  return getProductById(Number(productId)) || state.products.find(p => Number(p.id) === Number(productId)) || null;
}
function alp53ProductLabel(productId)
{
  const p = alp53GetProduct(productId);
  if (!p) return `#${productId}`;
  return `${p.nombre || p.name || "Producto"}${p.marca ? ` · ${p.marca}` : ""}`;
}
function alp53ProductOptions(excludedIds = new Set())
{
  return [...state.products]
    .filter(p => !excludedIds.has(Number(p.id)))
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" }))
    .map(p => `<option value="${alp53Attr(p.id)}">${alp53Escape(`${p.nombre || "Producto"}${p.marca ? ` · ${p.marca}` : ""}${p.ml ? ` · ${p.ml} ml` : ""}`)}</option>`)
    .join("");
}

function alp53NormalizeFinancial(row, type)
{
  const id = Number(alp53Pick(row, type === "gift" ? ["gift_set_id", "id"] : ["box_id", "discovery_box_id", "id"]));
  const retail = alp53MaybeNum(alp53Pick(row, ["normal_retail_value", "normal_retail", "retail_value", "precio_normal_total", "regular_price"]));
  const promo = alp53MaybeNum(alp53Pick(row, ["precio_promocional", "promo_price", "promotional_price"]));
  const cost = alp53MaybeNum(alp53Pick(row, ["total_cost", "known_cost", "cost", "costo_total"]));
  const missingCosts = alp53Num(alp53Pick(row, ["missing_costs", "costs_missing", "costos_faltantes"], 0));
  const profit = alp53MaybeNum(alp53Pick(row, ["estimated_profit", "profit", "ganancia_estimada"]));
  const margin = alp53MaybeNum(alp53Pick(row, ["margin_percent", "margin", "margen_porcentaje"]));
  const minimumSafePrice = alp53MaybeNum(alp53Pick(row, ["minimum_safe_price", "min_safe_price", "precio_minimo_seguro"]));
  const savingsFromView = alp53MaybeNum(alp53Pick(row, ["customer_savings", "savings", "ahorro_cliente"]));
  const discountFromView = alp53MaybeNum(alp53Pick(row, ["discount_percent", "discount_percentage", "descuento_porcentaje"]));
  const savings = savingsFromView !== null ? savingsFromView : (retail !== null && promo !== null ? Math.max(0, retail - promo) : null);
  const discount = discountFromView !== null ? discountFromView : (retail && retail > 0 && savings !== null ? (savings / retail) * 100 : null);
  const status = String(alp53Pick(row, ["financial_status", "status", "estado_financiero"], "") || "").toLowerCase();
  const canPublishRaw = alp53Pick(row, ["can_publish", "publishable", "puede_publicar"], false);
  const canPublish = canPublishRaw === true || canPublishRaw === "true" || canPublishRaw === 1;
  const activeRaw = alp53Pick(row, ["activo", "active"], false);
  const active = activeRaw === true || activeRaw === "true" || activeRaw === 1;
  return { raw: row, id, retail, promo, cost, missingCosts, profit, margin, minimumSafePrice, savings, discount, status, canPublish, active };
}

async function alp53LoadPacks({ force = false } = {})
{
  if (alp53PackState.loading) return;
  if (alp53PackState.loaded && !force)
  {
    alp53RenderIntoHost();
    return;
  }

  alp53PackState.loading = true;
  alp53PackState.error = "";
  alp53RenderIntoHost();

  try
  {
    if (!Array.isArray(state.products) || !state.products.length) await loadProducts();

    const [giftSets, giftProducts, boxes, boxProducts, giftFinance, boxFinance, decantSizes] = await Promise.all([
      supabaseClient.from("gift_sets").select("*").order("orden", { ascending: true }).order("id", { ascending: false }),
      supabaseClient.from("gift_set_products").select("*").order("orden", { ascending: true }).order("id", { ascending: true }),
      supabaseClient.from("discovery_boxes").select("*").order("orden", { ascending: true }).order("id", { ascending: false }),
      supabaseClient.from("discovery_box_products").select("*").order("orden", { ascending: true }).order("id", { ascending: true }),
      supabaseClient.from("admin_gift_set_financials").select("*"),
      supabaseClient.from("admin_discovery_box_financials").select("*"),
      supabaseClient.from("decant_sizes").select("ml,activo,orden").eq("activo", true).order("orden", { ascending: true }),
    ]);

    if (giftSets.error) throw giftSets.error;
    if (giftProducts.error) throw giftProducts.error;
    if (boxes.error) throw boxes.error;
    if (boxProducts.error) throw boxProducts.error;
    if (decantSizes.error) throw decantSizes.error;
    if (giftFinance.error) console.warn("PASO53 admin_gift_set_financials:", giftFinance.error.message);
    if (boxFinance.error) console.warn("PASO53 admin_discovery_box_financials:", boxFinance.error.message);

    alp53PackState.giftSets = Array.isArray(giftSets.data) ? giftSets.data : [];
    alp53PackState.giftSetProducts = Array.isArray(giftProducts.data) ? giftProducts.data : [];
    alp53PackState.discoveryBoxes = Array.isArray(boxes.data) ? boxes.data : [];
    alp53PackState.discoveryBoxProducts = Array.isArray(boxProducts.data) ? boxProducts.data : [];
    alp53PackState.giftFinancials = (Array.isArray(giftFinance.data) ? giftFinance.data : []).map(r => alp53NormalizeFinancial(r, "gift"));
    alp53PackState.discoveryFinancials = (Array.isArray(boxFinance.data) ? boxFinance.data : []).map(r => alp53NormalizeFinancial(r, "discovery"));
    alp53PackState.decantSizes = Array.isArray(decantSizes.data) ? decantSizes.data : [];
    alp53PackState.loaded = true;
  }
  catch (error)
  {
    console.error("PASO53 packs:", error);
    alp53PackState.error = error?.message || String(error);
  }
  finally
  {
    alp53PackState.loading = false;
    alp53RenderIntoHost();
  }
}

function alp53EnsureLoaded()
{
  if (!alp53PackState.loaded && !alp53PackState.loading) alp53LoadPacks();
}

function alp53GiftComponents(id)
{
  return alp53PackState.giftSetProducts
    .filter(r => Number(r.gift_set_id) === Number(id))
    .sort((a, b) => alp53Num(a.orden) - alp53Num(b.orden) || Number(a.id) - Number(b.id));
}
function alp53DiscoveryComponents(id)
{
  return alp53PackState.discoveryBoxProducts
    .filter(r => Number(r.discovery_box_id) === Number(id))
    .sort((a, b) => alp53Num(a.orden) - alp53Num(b.orden) || Number(a.id) - Number(b.id));
}
function alp53GiftFinancial(id)
{
  return alp53PackState.giftFinancials.find(r => Number(r.id) === Number(id)) || null;
}
function alp53DiscoveryFinancial(id)
{
  return alp53PackState.discoveryFinancials.find(r => Number(r.id) === Number(id)) || null;
}

function alp53StatusInfo(financial)
{
  const en = state.language === "en";
  if (!financial) return { cls: "neutral", label: en ? "No financial data" : "Sin cálculo financiero" };
  const status = financial.status;
  if (financial.canPublish) return { cls: "ok", label: en ? "Safe to publish" : "Apto para publicar" };
  if (["sin_productos", "no_products"].includes(status)) return { cls: "warn", label: en ? "No products" : "Sin productos" };
  if (["sin_precio", "no_price"].includes(status)) return { cls: "warn", label: en ? "No price" : "Sin precio" };
  if (["costos_incompletos", "missing_costs"].includes(status) || financial.missingCosts > 0) return { cls: "warn", label: en ? "Missing costs" : "Costos incompletos" };
  if (["perdida", "loss"].includes(status)) return { cls: "danger", label: en ? "Loss" : "Pérdida" };
  if (["margen_bajo", "low_margin"].includes(status)) return { cls: "danger", label: en ? "Low margin" : "Margen bajo" };
  return { cls: "danger", label: en ? "Publishing blocked" : "Publicación bloqueada" };
}

function alp53FinancialPanel(financial, promoPrice)
{
  const en = state.language === "en";
  const status = alp53StatusInfo(financial);
  return `
    <div class="alp53-finance ${alp53Attr(status.cls)}">
      <div class="alp53-finance-head">
        <strong>${alp53Escape(en ? "Financial control" : "Control financiero")}</strong>
        <span class="alp53-pill ${alp53Attr(status.cls)}">${alp53Escape(status.label)}</span>
      </div>
      <div class="alp53-finance-grid">
        <div><span>${en ? "Regular value" : "Valor normal"}</span><strong>${alp53Money(financial?.retail)}</strong></div>
        <div><span>${en ? "Promo price" : "Precio promo"}</span><strong>${alp53Money(financial?.promo ?? promoPrice)}</strong></div>
        <div><span>${en ? "Customer saves" : "Ahorro cliente"}</span><strong>${alp53Money(financial?.savings)}</strong></div>
        <div><span>${en ? "Discount" : "Descuento"}</span><strong>${alp53Percent(financial?.discount)}</strong></div>
        <div><span>${en ? "Known cost" : "Costo conocido"}</span><strong>${alp53Money(financial?.cost)}</strong></div>
        <div><span>${en ? "Estimated profit" : "Ganancia estimada"}</span><strong>${alp53Money(financial?.profit)}</strong></div>
        <div><span>${en ? "Margin" : "Margen"}</span><strong>${alp53Percent(financial?.margin)}</strong></div>
        <div><span>${en ? "Minimum safe price" : "Precio mínimo seguro"}</span><strong>${alp53Money(financial?.minimumSafePrice)}</strong></div>
      </div>
      ${financial?.missingCosts > 0 ? `<small>${alp53Escape(en ? `${financial.missingCosts} cost(s) are missing.` : `Faltan ${financial.missingCosts} costo(s).`)}</small>` : ""}
    </div>`;
}

function alp53Kpis()
{
  const gifts = alp53PackState.giftSets;
  const boxes = alp53PackState.discoveryBoxes;
  const activeGifts = gifts.filter(x => Boolean(x.activo)).length;
  const activeBoxes = boxes.filter(x => Boolean(x.activo)).length;
  const blocked = [
    ...alp53PackState.giftFinancials,
    ...alp53PackState.discoveryFinancials,
  ].filter(x => !x.canPublish).length;
  const en = state.language === "en";
  return `
    <div class="alp53-kpis">
      <article><span>${en ? "Gift Sets" : "Gift Sets"}</span><strong>${gifts.length}</strong><small>${activeGifts} ${en ? "active" : "activos"}</small></article>
      <article><span>${en ? "Discovery Boxes" : "Discovery Boxes"}</span><strong>${boxes.length}</strong><small>${activeBoxes} ${en ? "active" : "activas"}</small></article>
      <article><span>${en ? "Blocked" : "Bloqueados"}</span><strong>${blocked}</strong><small>${en ? "need review" : "requieren revisión"}</small></article>
    </div>`;
}

function alp53Tabs()
{
  const en = state.language === "en";
  return `
    <div class="alp53-subtabs">
      <button type="button" class="${alp53PackState.section === "gift_sets" ? "active" : ""}" data-action="admin-packs-section" data-section="gift_sets">${en ? "Gift Sets" : "Gift Sets"}</button>
      <button type="button" class="${alp53PackState.section === "discovery" ? "active" : ""}" data-action="admin-packs-section" data-section="discovery">Discovery Boxes</button>
    </div>`;
}

function alp53GiftEditor()
{
  const en = state.language === "en";
  if (alp53PackState.editGiftSetId === null) return "";
  const row = alp53PackState.editGiftSetId === "new" ? null : alp53PackState.giftSets.find(x => Number(x.id) === Number(alp53PackState.editGiftSetId));
  const financial = row ? alp53GiftFinancial(row.id) : null;
  const components = row ? alp53GiftComponents(row.id) : [];
  const excluded = new Set(components.map(x => Number(x.product_id)));

  return `
    <section class="alp53-editor">
      <div class="alp53-editor-head">
        <div><small>GIFT SET</small><h3>${alp53Escape(row ? row.nombre : (en ? "New Gift Set" : "Nuevo Gift Set"))}</h3></div>
        <button class="btn outline" type="button" data-action="admin-giftset-cancel">${en ? "Close" : "Cerrar"}</button>
      </div>
      <div class="alp53-form-grid">
        <label><span>${en ? "Name" : "Nombre"}</span><input id="alp53GiftName" value="${alp53Attr(row?.nombre || "")}" placeholder="Gift Set Signature"></label>
        <label><span>Slug</span><input id="alp53GiftSlug" value="${alp53Attr(row?.slug || "")}" placeholder="gift-signature"></label>
        <label><span>${en ? "Level" : "Nivel"}</span><select id="alp53GiftLevel">
          ${["Esencial", "Signature", "Luxury"].map(x => `<option value="${alp53Attr(x)}" ${String(row?.nivel || "Esencial") === x ? "selected" : ""}>${alp53Escape(x)}</option>`).join("")}
        </select></label>
        <label><span>${en ? "Promotional price" : "Precio promocional"}</span><input id="alp53GiftPrice" type="number" min="0" step="100" value="${alp53Attr(row?.precio_promocional ?? 0)}"></label>
        <label><span>${en ? "Packaging cost" : "Costo de presentación"}</span><input id="alp53GiftPackaging" type="number" min="0" step="100" value="${alp53Attr(row?.packaging_cost ?? 0)}"></label>
        <label><span>${en ? "Minimum margin %" : "Margen mínimo %"}</span><input id="alp53GiftMinMargin" type="number" min="0" max="99" step="0.1" value="${alp53Attr(row?.min_margin_percent ?? "")}" placeholder="25"></label>
        <label><span>${en ? "Badge" : "Insignia"}</span><input id="alp53GiftBadge" value="${alp53Attr(row?.badge_text || "")}" placeholder="Ahorro especial"></label>
        <label><span>${en ? "Order" : "Orden"}</span><input id="alp53GiftOrder" type="number" step="1" value="${alp53Attr(row?.orden ?? 0)}"></label>
        <label class="span-2"><span>${en ? "Description" : "Descripción"}</span><textarea id="alp53GiftDescription" rows="3">${alp53Escape(row?.descripcion || "")}</textarea></label>
      </div>
      <div class="alp53-check-row"><label><input id="alp53GiftFeatured" type="checkbox" ${row?.destacado ? "checked" : ""}> ${en ? "Featured" : "Destacado"}</label></div>
      <div class="alp53-editor-actions"><button class="btn" type="button" data-action="admin-giftset-save">${en ? "Save" : "Guardar"}</button></div>
      ${row ? alp53FinancialPanel(financial, row.precio_promocional) : `<div class="alp53-note">${en ? "Save the set first, then add products and review its financial safety." : "Guardá primero el set; después agregá productos y revisá su seguridad financiera."}</div>`}
      ${row ? alp53GiftComponentsEditor(row, components, excluded) : ""}
    </section>`;
}

function alp53GiftComponentsEditor(row, components, excluded)
{
  const en = state.language === "en";
  return `
    <div class="alp53-components">
      <div class="alp53-components-head"><div><small>${en ? "CONTENTS" : "CONTENIDO"}</small><h4>${en ? "Products in this Gift Set" : "Productos del Gift Set"}</h4></div><strong>${components.reduce((s, x) => s + alp53Num(x.cantidad, 1), 0)} ${en ? "unit(s)" : "unidad(es)"}</strong></div>
      <div class="alp53-add-row">
        <select id="alp53GiftProductSelect"><option value="">${en ? "Choose product…" : "Elegí producto…"}</option>${alp53ProductOptions(excluded)}</select>
        <input id="alp53GiftProductQty" type="number" min="1" max="20" value="1" aria-label="Cantidad">
        <button class="btn" type="button" data-action="admin-giftset-component-add" data-id="${alp53Attr(row.id)}">${en ? "Add" : "Agregar"}</button>
      </div>
      <div class="alp53-component-list">
        ${components.length ? components.map((c, index) => `
          <div class="alp53-component-row">
            <span class="alp53-order">${index + 1}</span>
            <div><strong>${alp53Escape(alp53ProductLabel(c.product_id))}</strong><small>${alp53Money(alp53GetProduct(c.product_id)?.precio)}</small></div>
            <label><span>${en ? "Qty" : "Cant."}</span><input id="alp53GiftQty-${alp53Attr(c.id)}" type="number" min="1" max="20" value="${alp53Attr(c.cantidad ?? 1)}"></label>
            <div class="alp53-row-actions">
              <button class="btn outline small" type="button" data-action="admin-giftset-component-save" data-id="${alp53Attr(c.id)}">${en ? "Save" : "Guardar"}</button>
              <button class="btn outline small" type="button" data-action="admin-giftset-component-move" data-id="${alp53Attr(c.id)}" data-direction="up" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="btn outline small" type="button" data-action="admin-giftset-component-move" data-id="${alp53Attr(c.id)}" data-direction="down" ${index === components.length - 1 ? "disabled" : ""}>↓</button>
              <button class="btn danger small" type="button" data-action="admin-giftset-component-remove" data-id="${alp53Attr(c.id)}">×</button>
            </div>
          </div>`).join("") : `<div class="alp53-empty">${en ? "No products yet." : "Todavía no agregaste productos."}</div>`}
      </div>
    </div>`;
}

function alp53GiftCards()
{
  const en = state.language === "en";
  if (!alp53PackState.giftSets.length) return `<div class="alp53-empty">${en ? "No Gift Sets yet." : "Todavía no hay Gift Sets."}</div>`;
  return `<div class="alp53-card-grid">${alp53PackState.giftSets.map(row =>
  {
    const fin = alp53GiftFinancial(row.id);
    const status = alp53StatusInfo(fin);
    const components = alp53GiftComponents(row.id);
    return `
      <article class="alp53-card">
        <div class="alp53-card-head">
          <div><div class="alp53-badges"><span class="alp53-pill ${row.activo ? "ok" : "neutral"}">${row.activo ? (en ? "Published" : "Publicado") : (en ? "Paused" : "Pausado")}</span><span class="alp53-pill ${alp53Attr(status.cls)}">${alp53Escape(status.label)}</span>${row.destacado ? `<span class="alp53-pill featured">${en ? "Featured" : "Destacado"}</span>` : ""}</div><h4>${alp53Escape(row.nombre)}</h4><small>${alp53Escape(row.nivel || "")}</small></div>
          <strong class="alp53-price">${alp53Money(row.precio_promocional)}</strong>
        </div>
        <div class="alp53-card-metrics"><div><span>${en ? "Products" : "Productos"}</span><strong>${components.length}</strong></div><div><span>${en ? "Savings" : "Ahorro"}</span><strong>${alp53Money(fin?.savings)}</strong></div><div><span>${en ? "Margin" : "Margen"}</span><strong>${alp53Percent(fin?.margin)}</strong></div></div>
        <p>${alp53Escape(row.descripcion || (en ? "No description." : "Sin descripción."))}</p>
        <div class="alp53-actions">
          <button class="btn outline" type="button" data-action="admin-giftset-edit" data-id="${alp53Attr(row.id)}">${en ? "Edit" : "Editar"}</button>
          ${row.activo
            ? `<button class="btn outline" type="button" data-action="admin-giftset-toggle" data-id="${alp53Attr(row.id)}" data-active="false">${en ? "Pause" : "Pausar"}</button>`
            : `<button class="btn" type="button" data-action="admin-giftset-toggle" data-id="${alp53Attr(row.id)}" data-active="true" ${fin?.canPublish ? "" : "disabled"}>${fin?.canPublish ? (en ? "Publish" : "Publicar") : (en ? "Blocked" : "Bloqueado")}</button>`}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function alp53RenderGiftSets()
{
  const en = state.language === "en";
  return `
    <section class="alp53-section">
      <div class="alp53-toolbar"><div><h3>Gift Sets</h3><p>${en ? "Build promotional full-bottle gift sets while protecting margin." : "Armá sets promocionales de botellas completas cuidando el margen."}</p></div><button class="btn" type="button" data-action="admin-giftset-new">${en ? "+ New Gift Set" : "+ Nuevo Gift Set"}</button></div>
      ${alp53GiftEditor()}
      ${alp53GiftCards()}
    </section>`;
}

function alp53DiscoveryEditor()
{
  const en = state.language === "en";
  if (alp53PackState.editDiscoveryId === null) return "";
  const row = alp53PackState.editDiscoveryId === "new" ? null : alp53PackState.discoveryBoxes.find(x => Number(x.id) === Number(alp53PackState.editDiscoveryId));
  const financial = row ? alp53DiscoveryFinancial(row.id) : null;
  const components = row ? alp53DiscoveryComponents(row.id) : [];

  return `
    <section class="alp53-editor">
      <div class="alp53-editor-head"><div><small>DISCOVERY BOX</small><h3>${alp53Escape(row ? row.nombre : (en ? "New Discovery Box" : "Nueva Discovery Box"))}</h3></div><button class="btn outline" type="button" data-action="admin-discovery-cancel">${en ? "Close" : "Cerrar"}</button></div>
      <div class="alp53-form-grid">
        <label><span>${en ? "Name" : "Nombre"}</span><input id="alp53DiscoveryName" value="${alp53Attr(row?.nombre || "")}" placeholder="Discovery Box Primavera"></label>
        <label><span>Slug</span><input id="alp53DiscoverySlug" value="${alp53Attr(row?.slug || "")}" placeholder="primavera"></label>
        <label><span>${en ? "Promotional price" : "Precio promocional"}</span><input id="alp53DiscoveryPrice" type="number" min="0" step="100" value="${alp53Attr(row?.precio_promocional ?? 0)}"></label>
        <label><span>${en ? "Packaging cost" : "Costo de presentación"}</span><input id="alp53DiscoveryPackaging" type="number" min="0" step="100" value="${alp53Attr(row?.packaging_cost ?? 0)}"></label>
        <label><span>${en ? "Minimum margin %" : "Margen mínimo %"}</span><input id="alp53DiscoveryMinMargin" type="number" min="0" max="99" step="0.1" value="${alp53Attr(row?.min_margin_percent ?? "")}" placeholder="25"></label>
        <label><span>${en ? "Order" : "Orden"}</span><input id="alp53DiscoveryOrder" type="number" step="1" value="${alp53Attr(row?.orden ?? 0)}"></label>
        <label class="span-2"><span>${en ? "Description" : "Descripción"}</span><textarea id="alp53DiscoveryDescription" rows="3">${alp53Escape(row?.descripcion || "")}</textarea></label>
      </div>
      <div class="alp53-editor-actions"><button class="btn" type="button" data-action="admin-discovery-save">${en ? "Save" : "Guardar"}</button></div>
      ${row ? alp53FinancialPanel(financial, row.precio_promocional) : `<div class="alp53-note">${en ? "Save the box first, then add decants and review margin." : "Guardá primero la box; después agregá decants y revisá el margen."}</div>`}
      ${row ? alp53DiscoveryComponentsEditor(row, components) : ""}
    </section>`;
}

function alp53DiscoveryComponentsEditor(row, components)
{
  const en = state.language === "en";
  const sizes = alp53PackState.decantSizes.map(s => Number(s.ml)).filter(Number.isFinite);
  return `
    <div class="alp53-components">
      <div class="alp53-components-head"><div><small>${en ? "DECANTS" : "DECANTS"}</small><h4>${en ? "Fragrances in this box" : "Fragancias de la box"}</h4></div><strong>${components.reduce((s, x) => s + alp53Num(x.cantidad, 1), 0)} decant(s)</strong></div>
      <div class="alp53-add-row discovery">
        <select id="alp53DiscoveryProductSelect"><option value="">${en ? "Choose perfume…" : "Elegí perfume…"}</option>${alp53ProductOptions()}</select>
        <select id="alp53DiscoveryMl">${sizes.map(ml => `<option value="${ml}">${ml} ml</option>`).join("")}</select>
        <input id="alp53DiscoveryQty" type="number" min="1" max="20" value="1" aria-label="Cantidad">
        <button class="btn" type="button" data-action="admin-discovery-component-add" data-id="${alp53Attr(row.id)}">${en ? "Add" : "Agregar"}</button>
      </div>
      <div class="alp53-component-list">
        ${components.length ? components.map((c, index) => `
          <div class="alp53-component-row discovery">
            <span class="alp53-order">${index + 1}</span>
            <div><strong>${alp53Escape(alp53ProductLabel(c.product_id))}</strong><small>${alp53Escape(`${c.ml} ml`)}</small></div>
            <label><span>ML</span><select id="alp53DiscoveryMl-${alp53Attr(c.id)}">${sizes.map(ml => `<option value="${ml}" ${Number(c.ml) === ml ? "selected" : ""}>${ml}</option>`).join("")}</select></label>
            <label><span>${en ? "Qty" : "Cant."}</span><input id="alp53DiscoveryQty-${alp53Attr(c.id)}" type="number" min="1" max="20" value="${alp53Attr(c.cantidad ?? 1)}"></label>
            <div class="alp53-row-actions">
              <button class="btn outline small" type="button" data-action="admin-discovery-component-save" data-id="${alp53Attr(c.id)}">${en ? "Save" : "Guardar"}</button>
              <button class="btn outline small" type="button" data-action="admin-discovery-component-move" data-id="${alp53Attr(c.id)}" data-direction="up" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="btn outline small" type="button" data-action="admin-discovery-component-move" data-id="${alp53Attr(c.id)}" data-direction="down" ${index === components.length - 1 ? "disabled" : ""}>↓</button>
              <button class="btn danger small" type="button" data-action="admin-discovery-component-remove" data-id="${alp53Attr(c.id)}">×</button>
            </div>
          </div>`).join("") : `<div class="alp53-empty">${en ? "No decants yet." : "Todavía no agregaste decants."}</div>`}
      </div>
    </div>`;
}

function alp53DiscoveryCards()
{
  const en = state.language === "en";
  if (!alp53PackState.discoveryBoxes.length) return `<div class="alp53-empty">${en ? "No Discovery Boxes yet." : "Todavía no hay Discovery Boxes."}</div>`;
  return `<div class="alp53-card-grid">${alp53PackState.discoveryBoxes.map(row =>
  {
    const fin = alp53DiscoveryFinancial(row.id);
    const status = alp53StatusInfo(fin);
    const components = alp53DiscoveryComponents(row.id);
    return `
      <article class="alp53-card">
        <div class="alp53-card-head"><div><div class="alp53-badges"><span class="alp53-pill ${row.activo ? "ok" : "neutral"}">${row.activo ? (en ? "Published" : "Publicada") : (en ? "Paused" : "Pausada")}</span><span class="alp53-pill ${alp53Attr(status.cls)}">${alp53Escape(status.label)}</span></div><h4>${alp53Escape(row.nombre)}</h4><small>${components.length} ${en ? "fragrance(s)" : "fragancia(s)"}</small></div><strong class="alp53-price">${alp53Money(row.precio_promocional)}</strong></div>
        <div class="alp53-card-metrics"><div><span>Decants</span><strong>${components.reduce((s, x) => s + alp53Num(x.cantidad, 1), 0)}</strong></div><div><span>${en ? "Profit" : "Ganancia"}</span><strong>${alp53Money(fin?.profit)}</strong></div><div><span>${en ? "Margin" : "Margen"}</span><strong>${alp53Percent(fin?.margin)}</strong></div></div>
        <p>${alp53Escape(row.descripcion || (en ? "No description." : "Sin descripción."))}</p>
        <div class="alp53-actions">
          <button class="btn outline" type="button" data-action="admin-discovery-edit" data-id="${alp53Attr(row.id)}">${en ? "Edit" : "Editar"}</button>
          ${row.activo
            ? `<button class="btn outline" type="button" data-action="admin-discovery-toggle" data-id="${alp53Attr(row.id)}" data-active="false">${en ? "Pause" : "Pausar"}</button>`
            : `<button class="btn" type="button" data-action="admin-discovery-toggle" data-id="${alp53Attr(row.id)}" data-active="true" ${fin?.canPublish ? "" : "disabled"}>${fin?.canPublish ? (en ? "Publish" : "Publicar") : (en ? "Blocked" : "Bloqueado")}</button>`}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function alp53RenderDiscovery()
{
  const en = state.language === "en";
  return `
    <section class="alp53-section">
      <div class="alp53-toolbar"><div><h3>Discovery Boxes</h3><p>${en ? "Build decant boxes and verify liquid cost, containers and margin before publishing." : "Armá cajas de decants y validá líquido, envases y margen antes de publicar."}</p></div><button class="btn" type="button" data-action="admin-discovery-new">${en ? "+ New Discovery Box" : "+ Nueva Discovery Box"}</button></div>
      ${alp53DiscoveryEditor()}
      ${alp53DiscoveryCards()}
    </section>`;
}

function renderAdminGiftPacksV2()
{
  const en = state.language === "en";
  if (alp53PackState.loading && !alp53PackState.loaded)
  {
    return `<div class="loading-state"><div class="spinner"></div><p>${en ? "Loading packs…" : "Cargando packs…"}</p></div>`;
  }
  if (alp53PackState.error && !alp53PackState.loaded)
  {
    return `<div class="admin-message error">${alp53Escape(alp53PackState.error)}</div><button class="btn" type="button" data-action="admin-packs-refresh">${en ? "Retry" : "Reintentar"}</button>`;
  }

  return `
    <div class="alp53-shell">
      <header class="alp53-hero">
        <div><small>PACKS V2</small><h2>${en ? "Gift Sets & Discovery Boxes" : "Gift Sets + Discovery Boxes"}</h2><p>${en ? "Create promotional packs without sacrificing margin. Publishing is blocked when financial validation fails." : "Creá packs promocionales sin sacrificar margen. La publicación se bloquea si la validación financiera falla."}</p></div>
        <button class="btn outline" type="button" data-action="admin-packs-refresh">${en ? "Refresh" : "Actualizar"}</button>
      </header>
      ${alp53Kpis()}
      ${alp53Tabs()}
      ${alp53PackState.section === "discovery" ? alp53RenderDiscovery() : alp53RenderGiftSets()}
    </div>`;
}

function alp53RenderIntoHost()
{
  if (state.admin?.tab !== "packs") return;
  const host = document.getElementById("adminTabContent");
  if (host) host.innerHTML = renderAdminGiftPacksV2();
}
function alp53SetSection(section)
{
  alp53PackState.section = section === "discovery" ? "discovery" : "gift_sets";
  alp53PackState.editGiftSetId = null;
  alp53PackState.editDiscoveryId = null;
  alp53RenderIntoHost();
}

async function alp53ReloadKeepEditor()
{
  const giftEdit = alp53PackState.editGiftSetId;
  const discoveryEdit = alp53PackState.editDiscoveryId;
  await alp53LoadPacks({ force: true });
  if (giftEdit !== "new") alp53PackState.editGiftSetId = giftEdit;
  if (discoveryEdit !== "new") alp53PackState.editDiscoveryId = discoveryEdit;
  alp53RenderIntoHost();
}

function alp53NewGiftSet() { alp53PackState.editGiftSetId = "new"; alp53RenderIntoHost(); }
function alp53EditGiftSet(id) { alp53PackState.editGiftSetId = Number(id); alp53RenderIntoHost(); }
function alp53CancelGiftSet() { alp53PackState.editGiftSetId = null; alp53RenderIntoHost(); }
function alp53NewDiscovery() { alp53PackState.editDiscoveryId = "new"; alp53RenderIntoHost(); }
function alp53EditDiscovery(id) { alp53PackState.editDiscoveryId = Number(id); alp53RenderIntoHost(); }
function alp53CancelDiscovery() { alp53PackState.editDiscoveryId = null; alp53RenderIntoHost(); }

async function alp53SaveGiftSet()
{
  if (alp53PackState.saving) return;
  alp53PackState.saving = true;
  try
  {
    const name = alp53Value("alp53GiftName");
    if (!name) throw new Error(state.language === "en" ? "Name is required." : "El nombre es obligatorio.");
    const minMarginRaw = alp53Value("alp53GiftMinMargin");
    const payload = {
      slug: alp53Slugify(alp53Value("alp53GiftSlug") || name),
      nombre: name,
      descripcion: alp53Value("alp53GiftDescription") || null,
      precio_promocional: Math.max(0, alp53Num(alp53Value("alp53GiftPrice"), 0)),
      nivel: alp53Value("alp53GiftLevel") || "Esencial",
      packaging_cost: Math.max(0, alp53Num(alp53Value("alp53GiftPackaging"), 0)),
      min_margin_percent: minMarginRaw === "" ? null : Math.max(0, Math.min(99, alp53Num(minMarginRaw, 25))),
      badge_text: alp53Value("alp53GiftBadge") || null,
      orden: Math.trunc(alp53Num(alp53Value("alp53GiftOrder"), 0)),
      destacado: alp53Checked("alp53GiftFeatured"),
      updated_at: new Date().toISOString(),
    };

    let result;
    if (alp53PackState.editGiftSetId === "new")
    {
      result = await supabaseClient.from("gift_sets").insert({ ...payload, activo: false }).select("*").single();
    }
    else
    {
      result = await supabaseClient.from("gift_sets").update(payload).eq("id", Number(alp53PackState.editGiftSetId)).select("*").single();
    }
    if (result.error) throw result.error;
    alp53PackState.editGiftSetId = Number(result.data.id);
    await alp53LoadPacks({ force: true });
    alp53PackState.editGiftSetId = Number(result.data.id);
    await alp53EnforceSafety("gift_set", result.data.id);
    alp53RenderIntoHost();
    adminMessage(state.language === "en" ? "Gift Set saved." : "Gift Set guardado.", "ok");
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
  finally { alp53PackState.saving = false; }
}

async function alp53SaveDiscovery()
{
  if (alp53PackState.saving) return;
  alp53PackState.saving = true;
  try
  {
    const name = alp53Value("alp53DiscoveryName");
    if (!name) throw new Error(state.language === "en" ? "Name is required." : "El nombre es obligatorio.");
    const minMarginRaw = alp53Value("alp53DiscoveryMinMargin");
    const payload = {
      slug: alp53Slugify(alp53Value("alp53DiscoverySlug") || name),
      nombre: name,
      descripcion: alp53Value("alp53DiscoveryDescription") || null,
      precio_promocional: Math.max(0, alp53Num(alp53Value("alp53DiscoveryPrice"), 0)),
      packaging_cost: Math.max(0, alp53Num(alp53Value("alp53DiscoveryPackaging"), 0)),
      min_margin_percent: minMarginRaw === "" ? null : Math.max(0, Math.min(99, alp53Num(minMarginRaw, 25))),
      orden: Math.trunc(alp53Num(alp53Value("alp53DiscoveryOrder"), 0)),
      updated_at: new Date().toISOString(),
    };
    let result;
    if (alp53PackState.editDiscoveryId === "new") result = await supabaseClient.from("discovery_boxes").insert({ ...payload, activo: false }).select("*").single();
    else result = await supabaseClient.from("discovery_boxes").update(payload).eq("id", Number(alp53PackState.editDiscoveryId)).select("*").single();
    if (result.error) throw result.error;
    alp53PackState.editDiscoveryId = Number(result.data.id);
    await alp53LoadPacks({ force: true });
    alp53PackState.editDiscoveryId = Number(result.data.id);
    await alp53EnforceSafety("discovery_box", result.data.id);
    alp53RenderIntoHost();
    adminMessage(state.language === "en" ? "Discovery Box saved." : "Discovery Box guardada.", "ok");
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
  finally { alp53PackState.saving = false; }
}

async function alp53Toggle(type, id, active)
{
  try
  {
    const result = await supabaseClient.rpc("admin_set_entity_visibility", {
      p_entity_type: type,
      p_entity_id: Number(id),
      p_active: Boolean(active),
    });
    if (result.error) throw result.error;
    await alp53LoadPacks({ force: true });
    adminMessage(active ? (state.language === "en" ? "Published safely." : "Publicado de forma segura.") : (state.language === "en" ? "Paused." : "Pausado."), "ok");
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}

async function alp53EnforceSafety(type, id)
{
  const entity = type === "gift_set"
    ? alp53PackState.giftSets.find(x => Number(x.id) === Number(id))
    : alp53PackState.discoveryBoxes.find(x => Number(x.id) === Number(id));
  const fin = type === "gift_set" ? alp53GiftFinancial(id) : alp53DiscoveryFinancial(id);
  if (entity?.activo && fin && !fin.canPublish)
  {
    const result = await supabaseClient.rpc("admin_set_entity_visibility", {
      p_entity_type: type,
      p_entity_id: Number(id),
      p_active: false,
    });
    if (!result.error)
    {
      await alp53LoadPacks({ force: true });
      adminMessage(state.language === "en" ? "The pack was automatically paused because it no longer meets the financial rule." : "El pack se pausó automáticamente porque dejó de cumplir la regla financiera.", "error");
    }
  }
}

async function alp53AddGiftComponent(giftSetId)
{
  const productId = Number(alp53Value("alp53GiftProductSelect"));
  const qty = Math.max(1, Math.min(20, Math.trunc(alp53Num(alp53Value("alp53GiftProductQty"), 1))));
  if (!productId) return;
  try
  {
    const maxOrder = alp53GiftComponents(giftSetId).reduce((m, x) => Math.max(m, alp53Num(x.orden)), 0);
    const result = await supabaseClient.from("gift_set_products").insert({ gift_set_id: Number(giftSetId), product_id: productId, cantidad: qty, orden: maxOrder + 10 });
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("gift_set", giftSetId);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}
async function alp53SaveGiftComponent(id)
{
  const row = alp53PackState.giftSetProducts.find(x => Number(x.id) === Number(id));
  if (!row) return;
  const qty = Math.max(1, Math.min(20, Math.trunc(alp53Num(alp53Value(`alp53GiftQty-${id}`), 1))));
  try
  {
    const result = await supabaseClient.from("gift_set_products").update({ cantidad: qty }).eq("id", Number(id));
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("gift_set", row.gift_set_id);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}
async function alp53RemoveGiftComponent(id)
{
  const row = alp53PackState.giftSetProducts.find(x => Number(x.id) === Number(id));
  if (!row) return;
  try
  {
    const result = await supabaseClient.from("gift_set_products").delete().eq("id", Number(id));
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("gift_set", row.gift_set_id);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}

async function alp53AddDiscoveryComponent(boxId)
{
  const productId = Number(alp53Value("alp53DiscoveryProductSelect"));
  const ml = Number(alp53Value("alp53DiscoveryMl"));
  const qty = Math.max(1, Math.min(20, Math.trunc(alp53Num(alp53Value("alp53DiscoveryQty"), 1))));
  if (!productId || !ml) return;
  try
  {
    const duplicate = alp53DiscoveryComponents(boxId).some(x => Number(x.product_id) === productId && Number(x.ml) === ml);
    if (duplicate) throw new Error(state.language === "en" ? "That perfume and size are already in the box." : "Ese perfume y tamaño ya están en la box.");
    const maxOrder = alp53DiscoveryComponents(boxId).reduce((m, x) => Math.max(m, alp53Num(x.orden)), 0);
    const result = await supabaseClient.from("discovery_box_products").insert({ discovery_box_id: Number(boxId), product_id: productId, ml, cantidad: qty, orden: maxOrder + 10 });
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("discovery_box", boxId);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}
async function alp53SaveDiscoveryComponent(id)
{
  const row = alp53PackState.discoveryBoxProducts.find(x => Number(x.id) === Number(id));
  if (!row) return;
  const ml = Number(alp53Value(`alp53DiscoveryMl-${id}`));
  const qty = Math.max(1, Math.min(20, Math.trunc(alp53Num(alp53Value(`alp53DiscoveryQty-${id}`), 1))));
  try
  {
    const duplicate = alp53DiscoveryComponents(row.discovery_box_id).some(x => Number(x.id) !== Number(id) && Number(x.product_id) === Number(row.product_id) && Number(x.ml) === ml);
    if (duplicate) throw new Error(state.language === "en" ? "That perfume and size are already in the box." : "Ese perfume y tamaño ya están en la box.");
    const result = await supabaseClient.from("discovery_box_products").update({ ml, cantidad: qty }).eq("id", Number(id));
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("discovery_box", row.discovery_box_id);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}
async function alp53RemoveDiscoveryComponent(id)
{
  const row = alp53PackState.discoveryBoxProducts.find(x => Number(x.id) === Number(id));
  if (!row) return;
  try
  {
    const result = await supabaseClient.from("discovery_box_products").delete().eq("id", Number(id));
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
    await alp53EnforceSafety("discovery_box", row.discovery_box_id);
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}

async function alp53MoveComponent(kind, id, direction)
{
  const source = kind === "gift" ? alp53PackState.giftSetProducts : alp53PackState.discoveryBoxProducts;
  const row = source.find(x => Number(x.id) === Number(id));
  if (!row) return;
  const rows = kind === "gift" ? alp53GiftComponents(row.gift_set_id) : alp53DiscoveryComponents(row.discovery_box_id);
  const idx = rows.findIndex(x => Number(x.id) === Number(id));
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || targetIdx < 0 || targetIdx >= rows.length) return;
  const other = rows[targetIdx];
  const table = kind === "gift" ? "gift_set_products" : "discovery_box_products";
  try
  {
    const temp = -900000 - Number(id);
    let result = await supabaseClient.from(table).update({ orden: temp }).eq("id", Number(row.id));
    if (result.error) throw result.error;
    result = await supabaseClient.from(table).update({ orden: alp53Num(row.orden) }).eq("id", Number(other.id));
    if (result.error) throw result.error;
    result = await supabaseClient.from(table).update({ orden: alp53Num(other.orden) }).eq("id", Number(row.id));
    if (result.error) throw result.error;
    await alp53ReloadKeepEditor();
  }
  catch (error) { adminMessage(error?.message || String(error), "error"); }
}

window.renderAdminGiftPacksV2 = renderAdminGiftPacksV2;
window.alp53LoadPacks = alp53LoadPacks;
window.alp53EnsureLoaded = alp53EnsureLoaded;
window.alp53SetSection = alp53SetSection;
window.alp53NewGiftSet = alp53NewGiftSet;
window.alp53EditGiftSet = alp53EditGiftSet;
window.alp53CancelGiftSet = alp53CancelGiftSet;
window.alp53SaveGiftSet = alp53SaveGiftSet;
window.alp53NewDiscovery = alp53NewDiscovery;
window.alp53EditDiscovery = alp53EditDiscovery;
window.alp53CancelDiscovery = alp53CancelDiscovery;
window.alp53SaveDiscovery = alp53SaveDiscovery;
window.alp53Toggle = alp53Toggle;
window.alp53AddGiftComponent = alp53AddGiftComponent;
window.alp53SaveGiftComponent = alp53SaveGiftComponent;
window.alp53RemoveGiftComponent = alp53RemoveGiftComponent;
window.alp53AddDiscoveryComponent = alp53AddDiscoveryComponent;
window.alp53SaveDiscoveryComponent = alp53SaveDiscoveryComponent;
window.alp53RemoveDiscoveryComponent = alp53RemoveDiscoveryComponent;
window.alp53MoveComponent = alp53MoveComponent;
