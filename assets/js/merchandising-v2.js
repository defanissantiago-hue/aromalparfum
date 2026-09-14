"use strict";

// =========================================================
// AromaLParfum — PASO 52
// Campañas + banners + Fragancia de la Semana (solo Admin)
// =========================================================

const alp52MerchState = {
  loaded: false,
  loading: false,
  saving: false,
  error: "",
  section: "campaigns",
  campaigns: [],
  campaignProducts: [],
  banners: [],
  weekly: [],
  editCampaignId: null,
  editBannerId: null,
  editWeeklyId: null,
};

window.alp52MerchState = alp52MerchState;

function alp52Escape(value)
{
  return escapeHtml(String(value ?? ""));
}

function alp52Attr(value)
{
  return escapeAttribute(String(value ?? ""));
}

function alp52Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp52Slugify(value)
{
  return String(value || "campana")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "campana";
}

function alp52ToLocalInput(value)
{
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function alp52FromLocalInput(value)
{
  const text = String(value || "").trim();
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function alp52DateLabel(value)
{
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    state.language === "en" ? "en-US" : "es-AR",
    { dateStyle: "short", timeStyle: "short" }
  ).format(d);
}

function alp52GetProduct(productId)
{
  return getProductById(Number(productId)) || state.products.find(p => Number(p.id) === Number(productId)) || null;
}

function alp52CampaignStatus(row)
{
  if (!row?.activo) return { key: "inactive", label: state.language === "en" ? "Inactive" : "Inactiva" };
  const now = Date.now();
  const start = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const end = row.ends_at ? new Date(row.ends_at).getTime() : null;
  if (start && start > now) return { key: "scheduled", label: state.language === "en" ? "Scheduled" : "Programada" };
  if (end && end <= now) return { key: "ended", label: state.language === "en" ? "Ended" : "Finalizada" };
  return { key: "active", label: state.language === "en" ? "Active" : "Activa" };
}

function alp52BannerStatus(row)
{
  return alp52CampaignStatus(row);
}

function alp52WeeklyStatus(row)
{
  return alp52CampaignStatus(row);
}

async function alp52LoadMerchandising({ force = false } = {})
{
  if (alp52MerchState.loading) return;
  if (alp52MerchState.loaded && !force)
  {
    alp52RenderIntoHost();
    return;
  }

  alp52MerchState.loading = true;
  alp52MerchState.error = "";
  alp52RenderIntoHost();

  try
  {
    if (!Array.isArray(state.products) || !state.products.length)
    {
      await loadProducts();
    }

    const [campaignsResult, productsResult, bannersResult, weeklyResult] = await Promise.all([
      supabaseClient.from("campaigns").select("*").order("orden", { ascending: true }).order("id", { ascending: false }),
      supabaseClient.from("campaign_products").select("id,campaign_id,product_id,orden,destacado,label").order("orden", { ascending: true }).order("id", { ascending: true }),
      supabaseClient.from("campaign_banners").select("*").order("placement", { ascending: true }).order("orden", { ascending: true }).order("id", { ascending: false }),
      supabaseClient.from("weekly_fragrances").select("*").order("starts_at", { ascending: false }).order("id", { ascending: false }),
    ]);

    if (campaignsResult.error) throw campaignsResult.error;
    if (productsResult.error) throw productsResult.error;
    if (bannersResult.error) throw bannersResult.error;
    if (weeklyResult.error) throw weeklyResult.error;

    alp52MerchState.campaigns = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
    alp52MerchState.campaignProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
    alp52MerchState.banners = Array.isArray(bannersResult.data) ? bannersResult.data : [];
    alp52MerchState.weekly = Array.isArray(weeklyResult.data) ? weeklyResult.data : [];
    alp52MerchState.loaded = true;
  }
  catch (error)
  {
    console.error("PASO52 merchandising:", error);
    alp52MerchState.error = error?.message || String(error);
  }
  finally
  {
    alp52MerchState.loading = false;
    alp52RenderIntoHost();
  }
}

function alp52EnsureMerchandisingLoaded()
{
  if (!alp52MerchState.loaded && !alp52MerchState.loading)
  {
    alp52LoadMerchandising();
  }
}

function alp52RenderIntoHost()
{
  if (state.admin.tab !== "merchandising") return;
  const host = document.getElementById("adminTabContent");
  if (host) host.innerHTML = renderAdminMerchandisingV2();
}

function alp52Stats()
{
  const now = Date.now();
  const activeCampaigns = alp52MerchState.campaigns.filter(c =>
  {
    if (!c.activo) return false;
    const start = c.starts_at ? new Date(c.starts_at).getTime() : null;
    const end = c.ends_at ? new Date(c.ends_at).getTime() : null;
    return (!start || start <= now) && (!end || end > now);
  }).length;

  const activeBanners = alp52MerchState.banners.filter(b =>
  {
    if (!b.activo) return false;
    const start = b.starts_at ? new Date(b.starts_at).getTime() : null;
    const end = b.ends_at ? new Date(b.ends_at).getTime() : null;
    return (!start || start <= now) && (!end || end > now);
  }).length;

  const activeWeekly = alp52MerchState.weekly.filter(w =>
  {
    if (!w.activo) return false;
    const start = new Date(w.starts_at).getTime();
    const end = new Date(w.ends_at).getTime();
    return start <= now && end > now;
  }).length;

  return {
    campaigns: alp52MerchState.campaigns.length,
    activeCampaigns,
    banners: alp52MerchState.banners.length,
    activeBanners,
    weekly: alp52MerchState.weekly.length,
    activeWeekly,
  };
}

function alp52Kpi(label, value, note = "")
{
  return `<article class="alp52-kpi"><span>${alp52Escape(label)}</span><strong>${alp52Escape(value)}</strong>${note ? `<small>${alp52Escape(note)}</small>` : ""}</article>`;
}

function alp52SectionTabs()
{
  const en = state.language === "en";
  return `
    <div class="alp52-subtabs">
      <button class="${alp52MerchState.section === "campaigns" ? "active" : ""}" type="button" data-action="admin-merch-section" data-section="campaigns">${en ? "Campaigns" : "Campañas"}</button>
      <button class="${alp52MerchState.section === "banners" ? "active" : ""}" type="button" data-action="admin-merch-section" data-section="banners">${en ? "Banners" : "Banners"}</button>
      <button class="${alp52MerchState.section === "weekly" ? "active" : ""}" type="button" data-action="admin-merch-section" data-section="weekly">${en ? "Weekly fragrance" : "Fragancia de la semana"}</button>
    </div>`;
}

function alp52CampaignProducts(campaignId)
{
  return alp52MerchState.campaignProducts
    .filter(row => Number(row.campaign_id) === Number(campaignId))
    .sort((a, b) => alp52Num(a.orden) - alp52Num(b.orden));
}

function alp52RenderCampaigns()
{
  const en = state.language === "en";
  const editing = alp52MerchState.editCampaignId === "new"
    ? null
    : alp52MerchState.campaigns.find(c => Number(c.id) === Number(alp52MerchState.editCampaignId));

  return `
    <div class="alp52-toolbar">
      <div>
        <h3>${en ? "Campaigns & landing pages" : "Campañas y landings"}</h3>
        <p>${en ? "Schedule seasonal campaigns, launches and editorial selections without changing code." : "Programá campañas estacionales, lanzamientos y selecciones editoriales sin tocar código."}</p>
      </div>
      <button class="btn" type="button" data-action="admin-campaign-new">+ ${en ? "New campaign" : "Nueva campaña"}</button>
    </div>

    ${alp52MerchState.editCampaignId ? alp52RenderCampaignEditor(editing) : ""}

    <div class="alp52-card-grid">
      ${alp52MerchState.campaigns.length
        ? alp52MerchState.campaigns.map(row => alp52RenderCampaignCard(row)).join("")
        : `<div class="alp52-empty">${en ? "No campaigns yet." : "Todavía no hay campañas."}</div>`}
    </div>`;
}

function alp52RenderCampaignCard(row)
{
  const en = state.language === "en";
  const status = alp52CampaignStatus(row);
  const products = alp52CampaignProducts(row.id);
  return `
    <article class="alp52-card">
      <div class="alp52-card-head">
        <div>
          <div class="alp52-badge-row">
            <span class="alp52-status is-${alp52Attr(status.key)}">${alp52Escape(status.label)}</span>
            ${row.destacado ? `<span class="alp52-status is-featured">${en ? "Featured" : "Destacada"}</span>` : ""}
          </div>
          <h4>${alp52Escape(row.titulo || row.nombre)}</h4>
          <small>/${alp52Escape(row.slug || "")}</small>
        </div>
        <strong>${products.length} ${en ? "products" : "productos"}</strong>
      </div>
      ${row.subtitulo ? `<p>${alp52Escape(row.subtitulo)}</p>` : ""}
      <dl class="alp52-meta">
        <div><dt>${en ? "Type" : "Tipo"}</dt><dd>${alp52Escape(row.campaign_type || "custom")}</dd></div>
        <div><dt>${en ? "Starts" : "Inicio"}</dt><dd>${alp52Escape(alp52DateLabel(row.starts_at))}</dd></div>
        <div><dt>${en ? "Ends" : "Fin"}</dt><dd>${alp52Escape(alp52DateLabel(row.ends_at))}</dd></div>
        <div><dt>${en ? "Order" : "Orden"}</dt><dd>${alp52Escape(row.orden ?? 0)}</dd></div>
      </dl>
      <div class="alp52-actions">
        <button class="btn outline small" type="button" data-action="admin-campaign-edit" data-id="${alp52Attr(row.id)}">${en ? "Edit" : "Editar"}</button>
        ${row.landing_enabled && row.slug ? `<a class="btn outline small" href="../?campaign=${encodeURIComponent(String(row.slug))}" target="_blank" rel="noopener noreferrer">${en ? "View landing" : "Ver landing"}</a>` : ""}
        <button class="btn ${row.activo ? "outline" : ""} small" type="button" data-action="admin-campaign-toggle" data-id="${alp52Attr(row.id)}" data-active="${row.activo ? "false" : "true"}">${row.activo ? (en ? "Pause" : "Pausar") : (en ? "Publish" : "Publicar")}</button>
      </div>
    </article>`;
}

function alp52RenderCampaignEditor(row)
{
  const en = state.language === "en";
  const isNew = alp52MerchState.editCampaignId === "new";
  const data = row || {
    slug: "",
    campaign_type: "seasonal",
    nombre: "",
    eyebrow: "",
    titulo: "",
    subtitulo: "",
    descripcion: "",
    cta_label: "Descubrir colección",
    cta_target: "catalog",
    badge_text: "",
    image_path: "",
    mobile_image_path: "",
    landing_enabled: true,
    activo: false,
    destacado: false,
    orden: 10,
    marketing_cost: 0,
    starts_at: null,
    ends_at: null,
  };

  const products = isNew ? [] : alp52CampaignProducts(data.id);

  return `
    <section class="alp52-editor">
      <div class="alp52-editor-head">
        <div><small>${isNew ? (en ? "NEW" : "NUEVA") : `ID ${alp52Escape(data.id)}`}</small><h3>${isNew ? (en ? "Create campaign" : "Crear campaña") : (en ? "Edit campaign" : "Editar campaña")}</h3></div>
        <button class="btn outline small" type="button" data-action="admin-campaign-cancel">${en ? "Close" : "Cerrar"}</button>
      </div>

      <div class="alp52-form-grid">
        <label><span>${en ? "Internal name" : "Nombre interno"}</span><input id="alp52CampaignName" value="${alp52Attr(data.nombre || "")}" placeholder="Primavera 2026"></label>
        <label><span>Slug</span><input id="alp52CampaignSlug" value="${alp52Attr(data.slug || "")}" placeholder="primavera-2026"></label>
        <label><span>${en ? "Type" : "Tipo"}</span><select id="alp52CampaignType">${["seasonal","launch","promotion","editorial","gift","custom"].map(v => `<option value="${v}" ${data.campaign_type === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label><span>${en ? "Order" : "Orden"}</span><input id="alp52CampaignOrder" type="number" value="${alp52Attr(data.orden ?? 0)}"></label>
        <label class="span-2"><span>Eyebrow</span><input id="alp52CampaignEyebrow" value="${alp52Attr(data.eyebrow || "")}" placeholder="SELECCIÓN DE TEMPORADA"></label>
        <label class="span-2"><span>${en ? "Main title" : "Título principal"}</span><input id="alp52CampaignTitle" value="${alp52Attr(data.titulo || "")}" placeholder="Encontrá tu aroma para esta primavera"></label>
        <label class="span-2"><span>${en ? "Subtitle" : "Subtítulo"}</span><input id="alp52CampaignSubtitle" value="${alp52Attr(data.subtitulo || "")}" placeholder="Frescos · cítricos · florales"></label>
        <label class="span-2"><span>${en ? "Description" : "Descripción"}</span><textarea id="alp52CampaignDescription" rows="4">${alp52Escape(data.descripcion || "")}</textarea></label>
        <label><span>CTA</span><input id="alp52CampaignCtaLabel" value="${alp52Attr(data.cta_label || "")}" placeholder="Descubrir colección"></label>
        <label><span>CTA target</span><input id="alp52CampaignCtaTarget" value="${alp52Attr(data.cta_target || "")}" placeholder="catalog / collection:slug / product:123"></label>
        <label><span>Badge</span><input id="alp52CampaignBadge" value="${alp52Attr(data.badge_text || "")}" placeholder="Edición limitada"></label>
        <label><span>${en ? "Marketing cost" : "Costo de campaña"}</span><input id="alp52CampaignMarketingCost" type="number" min="0" step="0.01" value="${alp52Attr(data.marketing_cost ?? 0)}"></label>
        <label><span>${en ? "Starts" : "Inicio"}</span><input id="alp52CampaignStarts" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.starts_at))}"></label>
        <label><span>${en ? "Ends" : "Fin"}</span><input id="alp52CampaignEnds" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.ends_at))}"></label>
        <label class="span-2"><span>${en ? "Desktop image" : "Imagen escritorio"}</span><div class="alp52-file-row"><input id="alp52CampaignImage" value="${alp52Attr(data.image_path || "")}" placeholder="merchandising/... o https://..."><input id="alp52CampaignImageFile" type="file" accept="image/*"><button class="btn outline small" type="button" data-action="admin-merch-upload" data-file="alp52CampaignImageFile" data-target="alp52CampaignImage" data-folder="campaigns">${en ? "Upload" : "Subir"}</button></div></label>
        <label class="span-2"><span>${en ? "Mobile image" : "Imagen móvil"}</span><div class="alp52-file-row"><input id="alp52CampaignMobileImage" value="${alp52Attr(data.mobile_image_path || "")}" placeholder="merchandising/... o https://..."><input id="alp52CampaignMobileImageFile" type="file" accept="image/*"><button class="btn outline small" type="button" data-action="admin-merch-upload" data-file="alp52CampaignMobileImageFile" data-target="alp52CampaignMobileImage" data-folder="campaigns-mobile">${en ? "Upload" : "Subir"}</button></div></label>
      </div>

      <div class="alp52-check-row">
        <label><input id="alp52CampaignLanding" type="checkbox" ${data.landing_enabled ? "checked" : ""}> ${en ? "Landing enabled" : "Landing habilitada"}</label>
        <label><input id="alp52CampaignFeatured" type="checkbox" ${data.destacado ? "checked" : ""}> ${en ? "Featured" : "Destacada"}</label>
        <label><input id="alp52CampaignActive" type="checkbox" ${data.activo ? "checked" : ""}> ${en ? "Active / published" : "Activa / publicada"}</label>
      </div>

      <div class="alp52-editor-actions">
        <button class="btn" type="button" data-action="admin-campaign-save">${alp52MerchState.saving ? (en ? "Saving..." : "Guardando...") : (en ? "Save campaign" : "Guardar campaña")}</button>
      </div>

      ${!isNew ? alp52RenderCampaignProductsEditor(data, products) : `<div class="alp52-note">${en ? "Save the campaign first, then add products." : "Guardá primero la campaña y después agregá productos."}</div>`}
    </section>`;
}

function alp52RenderCampaignProductsEditor(campaign, products)
{
  const en = state.language === "en";
  const existingIds = new Set(products.map(row => Number(row.product_id)));
  const available = state.products
    .filter(p => !existingIds.has(Number(p.id)))
    .slice()
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  return `
    <div class="alp52-products-editor">
      <div class="alp52-products-head"><div><small>${en ? "CAMPAIGN PRODUCTS" : "PRODUCTOS DE CAMPAÑA"}</small><h4>${products.length} ${en ? "selected" : "seleccionados"}</h4></div></div>
      <div class="alp52-product-add">
        <select id="alp52CampaignProductSelect">
          <option value="">${en ? "Choose a product..." : "Elegí un producto..."}</option>
          ${available.map(p => `<option value="${alp52Attr(p.id)}">${alp52Escape(p.nombre)}${p.marca ? ` — ${alp52Escape(p.marca)}` : ""}</option>`).join("")}
        </select>
        <input id="alp52CampaignProductLabel" placeholder="${en ? "Optional label" : "Etiqueta opcional"}">
        <button class="btn outline" type="button" data-action="admin-campaign-product-add" data-campaign-id="${alp52Attr(campaign.id)}">+ ${en ? "Add" : "Agregar"}</button>
      </div>
      <div class="alp52-product-list">
        ${products.length ? products.map((row, index) => {
          const p = alp52GetProduct(row.product_id);
          return `<div class="alp52-product-row">
            <span class="alp52-order">${index + 1}</span>
            <div><strong>${alp52Escape(p?.nombre || `#${row.product_id}`)}</strong><small>${alp52Escape(p?.marca || "")}${row.label ? ` · ${alp52Escape(row.label)}` : ""}</small></div>
            <button class="btn outline small ${row.destacado ? "alp52-featured-on" : ""}" type="button" data-action="admin-campaign-product-featured" data-id="${alp52Attr(row.id)}" data-active="${row.destacado ? "false" : "true"}">${row.destacado ? "★" : "☆"} ${en ? "Featured" : "Destacado"}</button>
            <div class="alp52-row-actions">
              <button class="btn outline small" type="button" data-action="admin-campaign-product-move" data-id="${alp52Attr(row.id)}" data-direction="up" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="btn outline small" type="button" data-action="admin-campaign-product-move" data-id="${alp52Attr(row.id)}" data-direction="down" ${index === products.length - 1 ? "disabled" : ""}>↓</button>
              <button class="btn danger small" type="button" data-action="admin-campaign-product-remove" data-id="${alp52Attr(row.id)}">×</button>
            </div>
          </div>`;
        }).join("") : `<div class="alp52-empty small">${en ? "No products selected." : "No hay productos seleccionados."}</div>`}
      </div>
    </div>`;
}

function alp52RenderBanners()
{
  const en = state.language === "en";
  const editing = alp52MerchState.editBannerId === "new"
    ? null
    : alp52MerchState.banners.find(b => Number(b.id) === Number(alp52MerchState.editBannerId));
  return `
    <div class="alp52-toolbar">
      <div><h3>${en ? "Banners" : "Banners"}</h3><p>${en ? "Create scheduled banners for Home, Catalog, Decants, Gifts and Collections." : "Creá banners programados para Home, Catálogo, Decants, Regalos y Colecciones."}</p></div>
      <button class="btn" type="button" data-action="admin-banner-new">+ ${en ? "New banner" : "Nuevo banner"}</button>
    </div>
    ${alp52MerchState.editBannerId ? alp52RenderBannerEditor(editing) : ""}
    <div class="alp52-card-grid">
      ${alp52MerchState.banners.length ? alp52MerchState.banners.map(alp52RenderBannerCard).join("") : `<div class="alp52-empty">${en ? "No banners yet." : "Todavía no hay banners."}</div>`}
    </div>`;
}

function alp52RenderBannerCard(row)
{
  const en = state.language === "en";
  const status = alp52BannerStatus(row);
  const campaign = alp52MerchState.campaigns.find(c => Number(c.id) === Number(row.campaign_id));
  return `<article class="alp52-card">
    <div class="alp52-card-head"><div><span class="alp52-status is-${alp52Attr(status.key)}">${alp52Escape(status.label)}</span><h4>${alp52Escape(row.titulo)}</h4><small>${alp52Escape(row.placement)}</small></div><strong>#${alp52Escape(row.orden ?? 0)}</strong></div>
    ${row.subtitulo ? `<p>${alp52Escape(row.subtitulo)}</p>` : ""}
    <dl class="alp52-meta">
      <div><dt>${en ? "Campaign" : "Campaña"}</dt><dd>${alp52Escape(campaign?.nombre || "—")}</dd></div>
      <div><dt>${en ? "Starts" : "Inicio"}</dt><dd>${alp52Escape(alp52DateLabel(row.starts_at))}</dd></div>
      <div><dt>${en ? "Ends" : "Fin"}</dt><dd>${alp52Escape(alp52DateLabel(row.ends_at))}</dd></div>
    </dl>
    <div class="alp52-actions"><button class="btn outline small" type="button" data-action="admin-banner-edit" data-id="${alp52Attr(row.id)}">${en ? "Edit" : "Editar"}</button><button class="btn ${row.activo ? "outline" : ""} small" type="button" data-action="admin-banner-toggle" data-id="${alp52Attr(row.id)}" data-active="${row.activo ? "false" : "true"}">${row.activo ? (en ? "Pause" : "Pausar") : (en ? "Publish" : "Publicar")}</button></div>
  </article>`;
}

function alp52RenderBannerEditor(row)
{
  const en = state.language === "en";
  const isNew = alp52MerchState.editBannerId === "new";
  const data = row || { campaign_id: null, placement: "home_secondary", eyebrow: "", titulo: "", subtitulo: "", cta_label: "Descubrir", cta_target: "catalog", image_path: "", mobile_image_path: "", activo: false, orden: 10, starts_at: null, ends_at: null };
  return `<section class="alp52-editor">
    <div class="alp52-editor-head"><div><small>${isNew ? (en ? "NEW" : "NUEVO") : `ID ${alp52Escape(data.id)}`}</small><h3>${isNew ? (en ? "Create banner" : "Crear banner") : (en ? "Edit banner" : "Editar banner")}</h3></div><button class="btn outline small" type="button" data-action="admin-banner-cancel">${en ? "Close" : "Cerrar"}</button></div>
    <div class="alp52-form-grid">
      <label><span>${en ? "Placement" : "Ubicación"}</span><select id="alp52BannerPlacement">${["home_hero","home_secondary","catalog","decants","gifts","collections"].map(v => `<option value="${v}" ${data.placement === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label><span>${en ? "Campaign (optional)" : "Campaña (opcional)"}</span><select id="alp52BannerCampaign"><option value="">—</option>${alp52MerchState.campaigns.map(c => `<option value="${alp52Attr(c.id)}" ${Number(data.campaign_id) === Number(c.id) ? "selected" : ""}>${alp52Escape(c.nombre)}</option>`).join("")}</select></label>
      <label class="span-2"><span>Eyebrow</span><input id="alp52BannerEyebrow" value="${alp52Attr(data.eyebrow || "")}"></label>
      <label class="span-2"><span>${en ? "Title" : "Título"}</span><input id="alp52BannerTitle" value="${alp52Attr(data.titulo || "")}"></label>
      <label class="span-2"><span>${en ? "Subtitle" : "Subtítulo"}</span><input id="alp52BannerSubtitle" value="${alp52Attr(data.subtitulo || "")}"></label>
      <label><span>CTA</span><input id="alp52BannerCtaLabel" value="${alp52Attr(data.cta_label || "")}"></label>
      <label><span>CTA target</span><input id="alp52BannerCtaTarget" value="${alp52Attr(data.cta_target || "")}" placeholder="catalog"></label>
      <label><span>${en ? "Starts" : "Inicio"}</span><input id="alp52BannerStarts" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.starts_at))}"></label>
      <label><span>${en ? "Ends" : "Fin"}</span><input id="alp52BannerEnds" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.ends_at))}"></label>
      <label><span>${en ? "Order" : "Orden"}</span><input id="alp52BannerOrder" type="number" value="${alp52Attr(data.orden ?? 0)}"></label>
      <label class="alp52-inline-check"><input id="alp52BannerActive" type="checkbox" ${data.activo ? "checked" : ""}> ${en ? "Active / published" : "Activo / publicado"}</label>
      <label class="span-2"><span>${en ? "Desktop image" : "Imagen escritorio"}</span><div class="alp52-file-row"><input id="alp52BannerImage" value="${alp52Attr(data.image_path || "")}"><input id="alp52BannerImageFile" type="file" accept="image/*"><button class="btn outline small" type="button" data-action="admin-merch-upload" data-file="alp52BannerImageFile" data-target="alp52BannerImage" data-folder="banners">${en ? "Upload" : "Subir"}</button></div></label>
      <label class="span-2"><span>${en ? "Mobile image" : "Imagen móvil"}</span><div class="alp52-file-row"><input id="alp52BannerMobileImage" value="${alp52Attr(data.mobile_image_path || "")}"><input id="alp52BannerMobileImageFile" type="file" accept="image/*"><button class="btn outline small" type="button" data-action="admin-merch-upload" data-file="alp52BannerMobileImageFile" data-target="alp52BannerMobileImage" data-folder="banners-mobile">${en ? "Upload" : "Subir"}</button></div></label>
    </div>
    <div class="alp52-editor-actions"><button class="btn" type="button" data-action="admin-banner-save">${en ? "Save banner" : "Guardar banner"}</button></div>
  </section>`;
}

function alp52RenderWeekly()
{
  const en = state.language === "en";
  const editing = alp52MerchState.editWeeklyId === "new"
    ? null
    : alp52MerchState.weekly.find(w => Number(w.id) === Number(alp52MerchState.editWeeklyId));
  return `
    <div class="alp52-toolbar">
      <div><h3>${en ? "Weekly fragrance" : "Fragancia de la semana"}</h3><p>${en ? "Schedule the featured fragrance block shown on the Home page." : "Programá la fragancia destacada que aparece en la portada."}</p></div>
      <button class="btn" type="button" data-action="admin-weekly-new">+ ${en ? "New weekly fragrance" : "Nueva fragancia semanal"}</button>
    </div>
    ${alp52MerchState.editWeeklyId ? alp52RenderWeeklyEditor(editing) : ""}
    <div class="alp52-card-grid">
      ${alp52MerchState.weekly.length ? alp52MerchState.weekly.map(alp52RenderWeeklyCard).join("") : `<div class="alp52-empty">${en ? "No weekly fragrances yet." : "Todavía no hay fragancias semanales."}</div>`}
    </div>`;
}

function alp52RenderWeeklyCard(row)
{
  const en = state.language === "en";
  const status = alp52WeeklyStatus(row);
  const product = alp52GetProduct(row.product_id);
  return `<article class="alp52-card">
    <div class="alp52-card-head"><div><span class="alp52-status is-${alp52Attr(status.key)}">${alp52Escape(status.label)}</span><h4>${alp52Escape(product?.nombre || `#${row.product_id}`)}</h4><small>${alp52Escape(product?.marca || "")}</small></div></div>
    <p><strong>${alp52Escape(row.titulo || "Fragancia de la semana")}</strong>${row.subtitulo ? `<br>${alp52Escape(row.subtitulo)}` : ""}</p>
    <dl class="alp52-meta"><div><dt>${en ? "Starts" : "Inicio"}</dt><dd>${alp52Escape(alp52DateLabel(row.starts_at))}</dd></div><div><dt>${en ? "Ends" : "Fin"}</dt><dd>${alp52Escape(alp52DateLabel(row.ends_at))}</dd></div></dl>
    <div class="alp52-actions"><button class="btn outline small" type="button" data-action="admin-weekly-edit" data-id="${alp52Attr(row.id)}">${en ? "Edit" : "Editar"}</button><button class="btn ${row.activo ? "outline" : ""} small" type="button" data-action="admin-weekly-toggle" data-id="${alp52Attr(row.id)}" data-active="${row.activo ? "false" : "true"}">${row.activo ? (en ? "Pause" : "Pausar") : (en ? "Publish" : "Publicar")}</button></div>
  </article>`;
}

function alp52RenderWeeklyEditor(row)
{
  const en = state.language === "en";
  const isNew = alp52MerchState.editWeeklyId === "new";
  const startDefault = new Date();
  startDefault.setSeconds(0, 0);
  const endDefault = new Date(startDefault.getTime() + 7 * 24 * 60 * 60 * 1000);
  const data = row || { product_id: "", titulo: "Fragancia de la semana", subtitulo: "", descripcion: "", badge_text: "Fragancia de la semana", cta_label: "Descubrir fragancia", starts_at: startDefault.toISOString(), ends_at: endDefault.toISOString(), activo: false };
  const sorted = state.products.slice().sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
  return `<section class="alp52-editor">
    <div class="alp52-editor-head"><div><small>${isNew ? (en ? "NEW" : "NUEVA") : `ID ${alp52Escape(data.id)}`}</small><h3>${isNew ? (en ? "Schedule fragrance" : "Programar fragancia") : (en ? "Edit weekly fragrance" : "Editar fragancia semanal")}</h3></div><button class="btn outline small" type="button" data-action="admin-weekly-cancel">${en ? "Close" : "Cerrar"}</button></div>
    <div class="alp52-form-grid">
      <label class="span-2"><span>${en ? "Product" : "Producto"}</span><select id="alp52WeeklyProduct"><option value="">${en ? "Choose..." : "Elegí..."}</option>${sorted.map(p => `<option value="${alp52Attr(p.id)}" ${Number(data.product_id) === Number(p.id) ? "selected" : ""}>${alp52Escape(p.nombre)}${p.marca ? ` — ${alp52Escape(p.marca)}` : ""}</option>`).join("")}</select></label>
      <label class="span-2"><span>${en ? "Title" : "Título"}</span><input id="alp52WeeklyTitle" value="${alp52Attr(data.titulo || "")}"></label>
      <label class="span-2"><span>${en ? "Subtitle" : "Subtítulo"}</span><input id="alp52WeeklySubtitle" value="${alp52Attr(data.subtitulo || "")}"></label>
      <label class="span-2"><span>${en ? "Description" : "Descripción"}</span><textarea id="alp52WeeklyDescription" rows="4">${alp52Escape(data.descripcion || "")}</textarea></label>
      <label><span>Badge</span><input id="alp52WeeklyBadge" value="${alp52Attr(data.badge_text || "")}"></label>
      <label><span>CTA</span><input id="alp52WeeklyCta" value="${alp52Attr(data.cta_label || "")}"></label>
      <label><span>${en ? "Starts" : "Inicio"}</span><input id="alp52WeeklyStarts" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.starts_at))}"></label>
      <label><span>${en ? "Ends" : "Fin"}</span><input id="alp52WeeklyEnds" type="datetime-local" value="${alp52Attr(alp52ToLocalInput(data.ends_at))}"></label>
      <label class="alp52-inline-check span-2"><input id="alp52WeeklyActive" type="checkbox" ${data.activo ? "checked" : ""}> ${en ? "Active / published" : "Activa / publicada"}</label>
    </div>
    <div class="alp52-editor-actions"><button class="btn" type="button" data-action="admin-weekly-save">${en ? "Save" : "Guardar"}</button></div>
  </section>`;
}

function renderAdminMerchandisingV2()
{
  const en = state.language === "en";
  const stats = alp52Stats();

  if (alp52MerchState.loading && !alp52MerchState.loaded)
  {
    return `<div class="loading-state"><div class="spinner"></div><p>${en ? "Loading merchandising..." : "Cargando merchandising..."}</p></div>`;
  }

  if (alp52MerchState.error)
  {
    return `<div class="admin-message error">${alp52Escape(alp52MerchState.error)}</div><button class="btn" type="button" data-action="admin-merch-refresh">${en ? "Retry" : "Reintentar"}</button>`;
  }

  return `
    <section class="alp52-shell">
      <div class="alp52-hero">
        <div><small>MERCHANDISING V2</small><h2>${en ? "Campaigns, banners & weekly fragrance" : "Campañas, banners y fragancia semanal"}</h2><p>${en ? "Control what customers see on the storefront without editing code." : "Controlá lo que ve el cliente en la tienda sin editar código."}</p></div>
        <button class="btn outline" type="button" data-action="admin-merch-refresh">${en ? "Refresh" : "Actualizar"}</button>
      </div>
      <div class="alp52-kpis">
        ${alp52Kpi(en ? "Campaigns" : "Campañas", stats.campaigns, `${stats.activeCampaigns} ${en ? "active now" : "activas ahora"}`)}
        ${alp52Kpi("Banners", stats.banners, `${stats.activeBanners} ${en ? "active now" : "activos ahora"}`)}
        ${alp52Kpi(en ? "Weekly fragrance" : "Fragancia semanal", stats.weekly, `${stats.activeWeekly} ${en ? "active now" : "activa ahora"}`)}
      </div>
      ${alp52SectionTabs()}
      <div class="alp52-section">
        ${alp52MerchState.section === "banners" ? alp52RenderBanners() : alp52MerchState.section === "weekly" ? alp52RenderWeekly() : alp52RenderCampaigns()}
      </div>
    </section>`;
}

function alp52Field(id)
{
  return document.getElementById(id);
}

function alp52Value(id)
{
  return String(alp52Field(id)?.value || "").trim();
}

function alp52Checked(id)
{
  return Boolean(alp52Field(id)?.checked);
}

function alp52SetSection(section)
{
  alp52MerchState.section = ["campaigns", "banners", "weekly"].includes(section) ? section : "campaigns";
  alp52MerchState.editCampaignId = null;
  alp52MerchState.editBannerId = null;
  alp52MerchState.editWeeklyId = null;
  alp52RenderIntoHost();
}

function alp52NewCampaign()
{
  alp52MerchState.editCampaignId = "new";
  alp52RenderIntoHost();
}

function alp52EditCampaign(id)
{
  alp52MerchState.editCampaignId = Number(id);
  alp52RenderIntoHost();
}

function alp52CancelCampaign()
{
  alp52MerchState.editCampaignId = null;
  alp52RenderIntoHost();
}

async function alp52SaveCampaign()
{
  if (alp52MerchState.saving) return;
  alp52MerchState.saving = true;

  try
  {
    const name = alp52Value("alp52CampaignName");
    const title = alp52Value("alp52CampaignTitle");
    if (!name || !title) throw new Error(state.language === "en" ? "Name and title are required." : "El nombre y el título son obligatorios.");

    const slugRaw = alp52Value("alp52CampaignSlug") || name;
    const payload = {
      slug: alp52Slugify(slugRaw),
      campaign_type: alp52Value("alp52CampaignType") || "custom",
      nombre: name,
      eyebrow: alp52Value("alp52CampaignEyebrow") || null,
      titulo: title,
      subtitulo: alp52Value("alp52CampaignSubtitle") || null,
      descripcion: alp52Value("alp52CampaignDescription") || null,
      cta_label: alp52Value("alp52CampaignCtaLabel") || null,
      cta_target: alp52Value("alp52CampaignCtaTarget") || null,
      badge_text: alp52Value("alp52CampaignBadge") || null,
      image_path: alp52Value("alp52CampaignImage") || null,
      mobile_image_path: alp52Value("alp52CampaignMobileImage") || null,
      landing_enabled: alp52Checked("alp52CampaignLanding"),
      activo: alp52Checked("alp52CampaignActive"),
      destacado: alp52Checked("alp52CampaignFeatured"),
      orden: alp52Num(alp52Value("alp52CampaignOrder"), 0),
      marketing_cost: Math.max(0, alp52Num(alp52Value("alp52CampaignMarketingCost"), 0)),
      starts_at: alp52FromLocalInput(alp52Value("alp52CampaignStarts")),
      ends_at: alp52FromLocalInput(alp52Value("alp52CampaignEnds")),
      updated_at: new Date().toISOString(),
    };

    if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) throw new Error(state.language === "en" ? "End date must be after start date." : "La fecha de fin debe ser posterior al inicio.");

    let result;
    if (alp52MerchState.editCampaignId === "new")
    {
      result = await supabaseClient.from("campaigns").insert(payload).select("*").single();
    }
    else
    {
      result = await supabaseClient.from("campaigns").update(payload).eq("id", Number(alp52MerchState.editCampaignId)).select("*").single();
    }
    if (result.error) throw result.error;

    alp52MerchState.editCampaignId = Number(result.data.id);
    await alp52LoadMerchandising({ force: true });
    alp52MerchState.editCampaignId = Number(result.data.id);
    alp52RenderIntoHost();
    adminMessage(state.language === "en" ? "Campaign saved." : "Campaña guardada.", "ok");
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
  finally
  {
    alp52MerchState.saving = false;
  }
}

async function alp52ToggleEntity(type, id, active)
{
  try
  {
    const result = await supabaseClient.rpc("admin_set_entity_visibility", {
      p_entity_type: type,
      p_entity_id: Number(id),
      p_active: Boolean(active),
    });
    if (result.error) throw result.error;
    await alp52LoadMerchandising({ force: true });
    adminMessage(Boolean(active) ? (state.language === "en" ? "Published." : "Publicado.") : (state.language === "en" ? "Paused." : "Pausado."), "ok");
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp52AddCampaignProduct(campaignId)
{
  const productId = Number(alp52Value("alp52CampaignProductSelect"));
  if (!productId) return;
  try
  {
    const rows = alp52CampaignProducts(campaignId);
    const maxOrder = rows.reduce((max, row) => Math.max(max, alp52Num(row.orden)), 0);
    const result = await supabaseClient.from("campaign_products").insert({
      campaign_id: Number(campaignId),
      product_id: productId,
      orden: maxOrder + 10,
      destacado: false,
      label: alp52Value("alp52CampaignProductLabel") || null,
    });
    if (result.error) throw result.error;
    await alp52LoadMerchandising({ force: true });
    alp52MerchState.editCampaignId = Number(campaignId);
    alp52RenderIntoHost();
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp52RemoveCampaignProduct(id)
{
  try
  {
    const result = await supabaseClient.from("campaign_products").delete().eq("id", Number(id));
    if (result.error) throw result.error;
    await alp52LoadMerchandising({ force: true });
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp52MoveCampaignProduct(id, direction)
{
  const current = alp52MerchState.campaignProducts.find(r => Number(r.id) === Number(id));
  if (!current) return;
  const rows = alp52CampaignProducts(current.campaign_id);
  const idx = rows.findIndex(r => Number(r.id) === Number(id));
  const otherIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || otherIdx < 0 || otherIdx >= rows.length) return;
  const other = rows[otherIdx];
  try
  {
    const temp = -999999 - Number(id);
    let result = await supabaseClient.from("campaign_products").update({ orden: temp }).eq("id", Number(current.id));
    if (result.error) throw result.error;
    result = await supabaseClient.from("campaign_products").update({ orden: alp52Num(current.orden) }).eq("id", Number(other.id));
    if (result.error) throw result.error;
    result = await supabaseClient.from("campaign_products").update({ orden: alp52Num(other.orden) }).eq("id", Number(current.id));
    if (result.error) throw result.error;
    await alp52LoadMerchandising({ force: true });
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp52SetCampaignProductFeatured(id, active)
{
  try
  {
    const result = await supabaseClient.from("campaign_products").update({ destacado: Boolean(active) }).eq("id", Number(id));
    if (result.error) throw result.error;
    const row = alp52MerchState.campaignProducts.find(r => Number(r.id) === Number(id));
    if (row) row.destacado = Boolean(active);
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

function alp52NewBanner()
{
  alp52MerchState.editBannerId = "new";
  alp52RenderIntoHost();
}
function alp52EditBanner(id) { alp52MerchState.editBannerId = Number(id); alp52RenderIntoHost(); }
function alp52CancelBanner() { alp52MerchState.editBannerId = null; alp52RenderIntoHost(); }

async function alp52SaveBanner()
{
  try
  {
    const title = alp52Value("alp52BannerTitle");
    if (!title) throw new Error(state.language === "en" ? "Banner title is required." : "El título del banner es obligatorio.");
    const campaignId = Number(alp52Value("alp52BannerCampaign")) || null;
    const payload = {
      campaign_id: campaignId,
      placement: alp52Value("alp52BannerPlacement") || "home_secondary",
      eyebrow: alp52Value("alp52BannerEyebrow") || null,
      titulo: title,
      subtitulo: alp52Value("alp52BannerSubtitle") || null,
      cta_label: alp52Value("alp52BannerCtaLabel") || null,
      cta_target: alp52Value("alp52BannerCtaTarget") || null,
      image_path: alp52Value("alp52BannerImage") || null,
      mobile_image_path: alp52Value("alp52BannerMobileImage") || null,
      activo: alp52Checked("alp52BannerActive"),
      orden: alp52Num(alp52Value("alp52BannerOrder"), 0),
      starts_at: alp52FromLocalInput(alp52Value("alp52BannerStarts")),
      ends_at: alp52FromLocalInput(alp52Value("alp52BannerEnds")),
      updated_at: new Date().toISOString(),
    };
    if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) throw new Error(state.language === "en" ? "End date must be after start date." : "La fecha de fin debe ser posterior al inicio.");
    const result = alp52MerchState.editBannerId === "new"
      ? await supabaseClient.from("campaign_banners").insert(payload).select("*").single()
      : await supabaseClient.from("campaign_banners").update(payload).eq("id", Number(alp52MerchState.editBannerId)).select("*").single();
    if (result.error) throw result.error;
    alp52MerchState.editBannerId = null;
    await alp52LoadMerchandising({ force: true });
    adminMessage(state.language === "en" ? "Banner saved." : "Banner guardado.", "ok");
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

function alp52NewWeekly() { alp52MerchState.editWeeklyId = "new"; alp52RenderIntoHost(); }
function alp52EditWeekly(id) { alp52MerchState.editWeeklyId = Number(id); alp52RenderIntoHost(); }
function alp52CancelWeekly() { alp52MerchState.editWeeklyId = null; alp52RenderIntoHost(); }

async function alp52SaveWeekly()
{
  try
  {
    const productId = Number(alp52Value("alp52WeeklyProduct"));
    const startsAt = alp52FromLocalInput(alp52Value("alp52WeeklyStarts"));
    const endsAt = alp52FromLocalInput(alp52Value("alp52WeeklyEnds"));
    if (!productId) throw new Error(state.language === "en" ? "Choose a product." : "Elegí un producto.");
    if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) throw new Error(state.language === "en" ? "Enter a valid date range." : "Ingresá un rango de fechas válido.");
    const payload = {
      product_id: productId,
      titulo: alp52Value("alp52WeeklyTitle") || "Fragancia de la semana",
      subtitulo: alp52Value("alp52WeeklySubtitle") || null,
      descripcion: alp52Value("alp52WeeklyDescription") || null,
      badge_text: alp52Value("alp52WeeklyBadge") || "Fragancia de la semana",
      cta_label: alp52Value("alp52WeeklyCta") || "Descubrir fragancia",
      starts_at: startsAt,
      ends_at: endsAt,
      activo: alp52Checked("alp52WeeklyActive"),
      updated_at: new Date().toISOString(),
    };
    const result = alp52MerchState.editWeeklyId === "new"
      ? await supabaseClient.from("weekly_fragrances").insert(payload).select("*").single()
      : await supabaseClient.from("weekly_fragrances").update(payload).eq("id", Number(alp52MerchState.editWeeklyId)).select("*").single();
    if (result.error) throw result.error;
    alp52MerchState.editWeeklyId = null;
    await alp52LoadMerchandising({ force: true });
    adminMessage(state.language === "en" ? "Weekly fragrance saved." : "Fragancia semanal guardada.", "ok");
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp52UploadMedia(fileInputId, targetInputId, folder)
{
  const input = document.getElementById(fileInputId);
  const target = document.getElementById(targetInputId);
  const file = input?.files?.[0];
  if (!file || !target) return;

  try
  {
    if (!String(file.type || "").startsWith("image/")) throw new Error(state.language === "en" ? "Choose an image." : "Elegí una imagen.");
    if (file.size > CONFIG.maxImageBytes) throw new Error(state.language === "en" ? "Maximum image size is 8 MB." : "La imagen puede pesar como máximo 8 MB.");

    const optimized = typeof optimizeImageForUpload === "function"
      ? await optimizeImageForUpload(file, { maxWidth: 1800, maxHeight: 1400, quality: 0.84 })
      : file;

    const ext = String(optimized.name || "image.webp").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const random = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "");
    const path = `merchandising/${alp52Slugify(folder || "media")}/${random}.${ext}`;

    const result = await supabaseClient.storage.from(CONFIG.storageBucket).upload(path, optimized, {
      upsert: false,
      contentType: optimized.type || file.type,
      cacheControl: "31536000",
    });
    if (result.error) throw result.error;
    target.value = path;
    adminMessage(state.language === "en" ? "Image uploaded." : "Imagen subida.", "ok");
  }
  catch (error)
  {
    adminMessage(error?.message || String(error), "error");
  }
}

window.renderAdminMerchandisingV2 = renderAdminMerchandisingV2;
window.alp52LoadMerchandising = alp52LoadMerchandising;
window.alp52EnsureMerchandisingLoaded = alp52EnsureMerchandisingLoaded;
window.alp52SetSection = alp52SetSection;
window.alp52NewCampaign = alp52NewCampaign;
window.alp52EditCampaign = alp52EditCampaign;
window.alp52CancelCampaign = alp52CancelCampaign;
window.alp52SaveCampaign = alp52SaveCampaign;
window.alp52ToggleEntity = alp52ToggleEntity;
window.alp52AddCampaignProduct = alp52AddCampaignProduct;
window.alp52RemoveCampaignProduct = alp52RemoveCampaignProduct;
window.alp52MoveCampaignProduct = alp52MoveCampaignProduct;
window.alp52SetCampaignProductFeatured = alp52SetCampaignProductFeatured;
window.alp52NewBanner = alp52NewBanner;
window.alp52EditBanner = alp52EditBanner;
window.alp52CancelBanner = alp52CancelBanner;
window.alp52SaveBanner = alp52SaveBanner;
window.alp52NewWeekly = alp52NewWeekly;
window.alp52EditWeekly = alp52EditWeekly;
window.alp52CancelWeekly = alp52CancelWeekly;
window.alp52SaveWeekly = alp52SaveWeekly;
window.alp52UploadMedia = alp52UploadMedia;
