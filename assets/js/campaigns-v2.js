"use strict";

// AromaLParfum Frontend V2 — PASO 56
// Landings de Campaña V2 + deep links + atribución persistente.
// Reutiliza campaigns / campaign_products y el merchandising ya cargado.

const ALP56_CAMPAIGN_SESSION_KEY = "alp_campaign_slug_v2";
const alp56CampaignCache = new Map();
const alp56CampaignLoading = new Map();

function alp56NormalizeCampaignSlug(value)
{
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "")
    .slice(0, 150);
}

function alp56CampaignFromHome(slug)
{
  const normalized = alp56NormalizeCampaignSlug(slug);
  const rows = Array.isArray(state.homeMerchandising?.campaigns)
    ? state.homeMerchandising.campaigns
    : [];

  return rows.find(row => alp56NormalizeCampaignSlug(row?.slug) === normalized) || null;
}

function alp56CampaignStatus(campaign)
{
  if (!campaign)
  {
    return { available: false, key: "missing", label: "Campaña no disponible" };
  }

  if (campaign.activo === false)
  {
    return { available: false, key: "paused", label: "Campaña pausada" };
  }

  if (campaign.landing_enabled === false)
  {
    return { available: false, key: "disabled", label: "Landing no disponible" };
  }

  const now = Date.now();
  const starts = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
  const ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;

  if (Number.isFinite(starts) && starts > now)
  {
    return { available: false, key: "scheduled", label: "Próximamente" };
  }

  if (Number.isFinite(ends) && ends < now)
  {
    return { available: false, key: "ended", label: "Campaña finalizada" };
  }

  return { available: true, key: "active", label: "Disponible" };
}

function alp56CampaignProducts(campaign)
{
  const raw = Array.isArray(campaign?.products) ? campaign.products : [];
  const seen = new Set();

  return raw
    .slice()
    .sort((a, b) => Number(a?.orden || a?.order || 0) - Number(b?.orden || b?.order || 0))
    .map(row => {
      const id = Number(row?.product_id || row?.id || 0);
      const product = getProductById(id);
      if (!product || seen.has(id)) return null;
      seen.add(id);
      return {
        product,
        featured: Boolean(row?.destacado ?? row?.featured),
        label: String(row?.label || "").trim(),
      };
    })
    .filter(Boolean);
}

async function alp56ResolveCampaignMedia(campaign)
{
  const copy = { ...campaign };

  const desktopRaw = copy.resolved_image || copy.image || copy.image_path || "";
  const mobileRaw = copy.resolved_mobile_image || copy.mobile_image || copy.mobile_image_path || "";

  if (!copy.resolved_image && desktopRaw)
  {
    try
    {
      const resolved = await resolveImageValue(desktopRaw);
      copy.resolved_image = resolved?.url || "";
    }
    catch (_error)
    {
      copy.resolved_image = "";
    }
  }

  if (!copy.resolved_mobile_image && mobileRaw)
  {
    try
    {
      const resolved = await resolveImageValue(mobileRaw);
      copy.resolved_mobile_image = resolved?.url || "";
    }
    catch (_error)
    {
      copy.resolved_mobile_image = "";
    }
  }

  return copy;
}

async function alp56LoadCampaign(slug, options = {})
{
  const normalized = alp56NormalizeCampaignSlug(slug);
  if (!normalized) return null;

  if (!options.force && alp56CampaignCache.has(normalized))
  {
    return alp56CampaignCache.get(normalized);
  }

  if (!options.force && alp56CampaignLoading.has(normalized))
  {
    return alp56CampaignLoading.get(normalized);
  }

  const task = (async () => {
    // Primero reutilizamos el RPC de Home ya cargado: 0 consultas adicionales.
    const fromHome = alp56CampaignFromHome(normalized);
    if (fromHome)
    {
      const hydrated = await alp56ResolveCampaignMedia(fromHome);
      alp56CampaignCache.set(normalized, hydrated);
      return hydrated;
    }

    // Fallback para links directos si la campaña no vino en el payload de Home.
    // Las políticas RLS siguen decidiendo qué campaña puede ver el cliente.
    const campaignResult = await supabaseClient
      .from("campaigns")
      .select("id,slug,campaign_type,nombre,eyebrow,titulo,subtitulo,descripcion,cta_label,cta_target,badge_text,image_path,mobile_image_path,landing_enabled,activo,destacado,orden,starts_at,ends_at")
      .eq("slug", normalized)
      .maybeSingle();

    if (campaignResult.error)
    {
      console.debug("PASO56 campaign lookup:", campaignResult.error.message);
      alp56CampaignCache.set(normalized, null);
      return null;
    }

    if (!campaignResult.data)
    {
      alp56CampaignCache.set(normalized, null);
      return null;
    }

    const campaign = { ...campaignResult.data };
    const status = alp56CampaignStatus(campaign);

    // No exponemos productos de campañas no publicables.
    if (!status.available)
    {
      const hydrated = await alp56ResolveCampaignMedia(campaign);
      hydrated.products = [];
      alp56CampaignCache.set(normalized, hydrated);
      return hydrated;
    }

    const productsResult = await supabaseClient
      .from("campaign_products")
      .select("id,campaign_id,product_id,orden,destacado,label")
      .eq("campaign_id", Number(campaign.id))
      .order("orden", { ascending: true })
      .order("id", { ascending: true });

    if (productsResult.error)
    {
      console.debug("PASO56 campaign products:", productsResult.error.message);
      campaign.products = [];
    }
    else
    {
      campaign.products = productsResult.data || [];
    }

    const hydrated = await alp56ResolveCampaignMedia(campaign);
    alp56CampaignCache.set(normalized, hydrated);
    return hydrated;
  })().finally(() => {
    alp56CampaignLoading.delete(normalized);
  });

  alp56CampaignLoading.set(normalized, task);
  return task;
}

function alp56PersistCampaign(slug)
{
  const normalized = alp56NormalizeCampaignSlug(slug);
  if (!normalized) return;

  try
  {
    sessionStorage.setItem(ALP56_CAMPAIGN_SESSION_KEY, normalized);
  }
  catch (_error) {}
}

function campaignsV2ApplyInitialRoute()
{
  if (document.body?.dataset.entry === "admin") return false;

  const params = new URLSearchParams(location.search);
  const slug = alp56NormalizeCampaignSlug(params.get("campaign"));
  if (!slug) return false;

  alp56PersistCampaign(slug);
  state.route = "campaign";
  state.routePayload = { slug, campaign_slug: slug };
  return true;
}

function alp56CampaignName(campaign)
{
  return String(campaign?.titulo || campaign?.title || campaign?.nombre || campaign?.name || "AromaLParfum").trim();
}

function alp56CampaignSubtitle(campaign)
{
  return String(campaign?.subtitulo || campaign?.subtitle || "").trim();
}

function alp56CampaignDescription(campaign)
{
  return String(campaign?.descripcion || campaign?.description || "").trim();
}

function alp56CampaignBadge(campaign)
{
  return String(campaign?.badge_text || campaign?.badge || "").trim();
}

function alp56CampaignEyebrow(campaign)
{
  return String(campaign?.eyebrow || "Selección AromaLParfum").trim();
}

function alp56CampaignShareUrl(slug)
{
  const url = new URL(window.location.href);
  url.searchParams.delete("wishlist");
  url.searchParams.set("campaign", alp56NormalizeCampaignSlug(slug));
  url.hash = "";
  return url.toString();
}

async function alp56ShareCampaign(slug, title)
{
  const url = alp56CampaignShareUrl(slug);
  const shareTitle = title || "AromaLParfum";

  if (navigator.share)
  {
    try
    {
      await navigator.share({ title: shareTitle, text: "Mirá esta selección de AromaLParfum", url });
      return;
    }
    catch (error)
    {
      if (error?.name === "AbortError") return;
    }
  }

  try
  {
    await navigator.clipboard.writeText(url);
    toast("Link de campaña copiado.");
  }
  catch (_error)
  {
    window.prompt("Copiá este link:", url);
  }
}

function alp56RenderCampaignUnavailable(campaign, status)
{
  const title = campaign ? alp56CampaignName(campaign) : "Campaña no disponible";
  const message = status?.key === "scheduled"
    ? "Esta selección todavía no comenzó. Mientras tanto podés explorar el catálogo completo."
    : status?.key === "ended"
      ? "Esta campaña ya finalizó. Podés seguir descubriendo fragancias en el catálogo."
      : "Esta campaña no está disponible públicamente en este momento.";

  return `
    <section class="section campaign56-unavailable">
      <div class="container">
        <div class="empty-state campaign56-empty">
          <p class="eyebrow">${escapeHtml(status?.label || "AromaLParfum")}</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
          <button class="btn" type="button" data-route="catalog">Explorar perfumes</button>
        </div>
      </div>
    </section>`;
}

function alp56RenderCampaignHero(campaign, slug)
{
  const desktop = campaign?.resolved_image || "";
  const mobile = campaign?.resolved_mobile_image || "";
  const hasMedia = Boolean(desktop || mobile);
  const title = alp56CampaignName(campaign);
  const subtitle = alp56CampaignSubtitle(campaign);
  const description = alp56CampaignDescription(campaign);
  const badge = alp56CampaignBadge(campaign);

  return `
    <section class="campaign56-hero ${hasMedia ? "has-media" : ""}">
      <div class="container campaign56-hero-inner">
        <div class="campaign56-hero-copy">
          <p class="eyebrow">${escapeHtml(alp56CampaignEyebrow(campaign))}</p>
          ${badge ? `<span class="campaign56-badge">${escapeHtml(badge)}</span>` : ""}
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="campaign56-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          ${description ? `<p class="campaign56-description">${escapeHtml(description)}</p>` : ""}
          <div class="campaign56-actions">
            <button class="btn" type="button" data-campaign56-action="products">Ver selección</button>
            <button class="btn outline" type="button" data-campaign56-action="share" data-campaign-slug="${escapeAttribute(slug)}">Compartir</button>
          </div>
        </div>
        ${hasMedia ? `
          <div class="campaign56-hero-media">
            <picture>
              ${mobile ? `<source media="(max-width: 720px)" srcset="${escapeAttribute(mobile)}">` : ""}
              <img src="${escapeAttribute(desktop || mobile)}" alt="${escapeAttribute(title)}" loading="eager" decoding="async">
            </picture>
          </div>` : ""}
      </div>
    </section>`;
}

function alp56RenderCampaignProduct(item)
{
  return `
    <div class="campaign56-product-wrap ${item.featured ? "is-featured" : ""}">
      ${item.featured || item.label ? `
        <div class="campaign56-product-tag">
          ${item.featured ? "★ Selección destacada" : escapeHtml(item.label)}
        </div>` : ""}
      ${renderProductCard(item.product)}
    </div>`;
}

function alp56RenderCampaignLoaded(campaign, slug)
{
  const status = alp56CampaignStatus(campaign);
  if (!status.available)
  {
    return alp56RenderCampaignUnavailable(campaign, status);
  }

  const products = alp56CampaignProducts(campaign);
  const finalTarget = String(campaign?.cta_target || "catalog").trim();
  const finalLabel = String(campaign?.cta_label || "Ver catálogo completo").trim();

  return `
    ${alp56RenderCampaignHero(campaign, slug)}
    <section class="section campaign56-products" id="campaign56Products">
      <div class="container">
        <div class="section-title-row campaign56-title-row">
          <div>
            <p class="eyebrow">CURADURÍA DE CAMPAÑA</p>
            <h2 class="section-title">La selección</h2>
            <p class="section-subtitle">${products.length ? `${products.length} fragancias elegidas y ordenadas para esta campaña.` : "Esta campaña todavía no tiene productos publicados."}</p>
          </div>
          <span class="campaign56-count">${products.length} ${products.length === 1 ? "producto" : "productos"}</span>
        </div>

        ${products.length
          ? `<div class="product-grid campaign56-grid">${products.map(alp56RenderCampaignProduct).join("")}</div>`
          : `<div class="empty-state"><h3>La selección se está preparando.</h3><p>Mientras tanto podés recorrer el catálogo completo.</p></div>`}

        <div class="campaign56-footer-cta">
          ${typeof renderMerchandisingCta === "function"
            ? renderMerchandisingCta(finalTarget, finalLabel, "btn")
            : `<button class="btn" type="button" data-route="catalog">Ver catálogo</button>`}
        </div>
      </div>
    </section>`;
}

function campaignsV2RenderPage(slug)
{
  const normalized = alp56NormalizeCampaignSlug(slug);
  if (!normalized)
  {
    return alp56RenderCampaignUnavailable(null, { key: "missing", label: "Campaña no disponible" });
  }

  alp56PersistCampaign(normalized);

  if (alp56CampaignCache.has(normalized))
  {
    const campaign = alp56CampaignCache.get(normalized);
    return campaign
      ? alp56RenderCampaignLoaded(campaign, normalized)
      : alp56RenderCampaignUnavailable(null, { key: "missing", label: "Campaña no disponible" });
  }

  const fromHome = alp56CampaignFromHome(normalized);
  if (fromHome)
  {
    // Render inmediato con el payload ya presente; la hidratación de medios se completa después.
    return alp56RenderCampaignLoaded(fromHome, normalized);
  }

  return `
    <section class="section campaign56-loading">
      <div class="container">
        <div class="loading-state"><div class="spinner"></div><p>Cargando campaña…</p></div>
      </div>
    </section>`;
}

async function campaignsV2AfterRender(slug)
{
  const normalized = alp56NormalizeCampaignSlug(slug);
  if (!normalized) return;

  alp56PersistCampaign(normalized);

  const current = alp56CampaignCache.get(normalized);
  if (current !== undefined) return;

  const campaign = await alp56LoadCampaign(normalized);

  if (
    state.route === "campaign" &&
    alp56NormalizeCampaignSlug(state.routePayload?.slug) === normalized
  )
  {
    renderCurrentRoute();
  }

  return campaign;
}

function alp56OpenProducts()
{
  const target = document.getElementById("campaign56Products");
  if (target)
  {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-campaign56-action]");
  if (!button) return;

  const action = button.dataset.campaign56Action;
  if (action === "products")
  {
    event.preventDefault();
    alp56OpenProducts();
    return;
  }

  if (action === "share")
  {
    event.preventDefault();
    const slug = button.dataset.campaignSlug || state.routePayload?.slug || "";
    const campaign = alp56CampaignCache.get(alp56NormalizeCampaignSlug(slug)) || alp56CampaignFromHome(slug);
    alp56ShareCampaign(slug, alp56CampaignName(campaign));
  }
});
