"use strict";

// AromaLParfum Frontend V2 — Paso 38
// Home V2: campañas, banners y Fragancia de la Semana desde Supabase.
// Si no hay merchandising activo o el RPC falla, la portada anterior sigue funcionando.

function emptyHomeMerchandising()
{
  return {
    weekly_fragrance: null,
    campaigns: [],
    banners: [],
  };
}

async function resolveMerchandisingMediaValue(raw)
{
  if (!raw)
  {
    return "";
  }

  try
  {
    const resolved = await resolveImageValue(raw);
    return resolved?.url || "";
  }
  catch (error)
  {
    console.warn("No se pudo resolver un recurso de merchandising:", raw, error);
    return "";
  }
}

async function hydrateMerchandisingMedia(data)
{
  const source = data || emptyHomeMerchandising();

  const campaigns = Array.isArray(source.campaigns)
    ? source.campaigns.map(item => ({ ...item }))
    : [];

  const banners = Array.isArray(source.banners)
    ? source.banners.map(item => ({ ...item }))
    : [];

  await Promise.all([
    ...campaigns.flatMap(campaign => [
      (async () => {
        campaign.resolved_image = await resolveMerchandisingMediaValue(campaign.image);
      })(),
      (async () => {
        campaign.resolved_mobile_image = await resolveMerchandisingMediaValue(campaign.mobile_image);
      })(),
    ]),
    ...banners.flatMap(banner => [
      (async () => {
        banner.resolved_image = await resolveMerchandisingMediaValue(banner.image);
      })(),
      (async () => {
        banner.resolved_mobile_image = await resolveMerchandisingMediaValue(banner.mobile_image);
      })(),
    ]),
  ]);

  return {
    weekly_fragrance: source.weekly_fragrance || null,
    campaigns,
    banners,
  };
}

async function loadHomeMerchandising()
{
  state.homeMerchandisingLoaded = false;
  state.homeMerchandising = emptyHomeMerchandising();

  // El Admin no necesita cargar merchandising de portada.
  if (document.body?.dataset.entry === "admin")
  {
    state.homeMerchandisingLoaded = true;
    return;
  }

  try
  {
    const result = await supabaseClient.rpc("get_home_merchandising");

    if (result.error)
    {
      console.warn("get_home_merchandising:", result.error.message);
      state.homeMerchandisingLoaded = true;
      return;
    }

    state.homeMerchandising = await hydrateMerchandisingMedia(
      result.data || emptyHomeMerchandising()
    );

    state.homeMerchandisingLoaded = true;
  }
  catch (error)
  {
    console.warn("No se pudo cargar Home V2; se usa la portada anterior:", error);
    state.homeMerchandising = emptyHomeMerchandising();
    state.homeMerchandisingLoaded = true;
  }
}

function getHomeMerchandising()
{
  return state.homeMerchandising || emptyHomeMerchandising();
}

function getHomeBanners(placement)
{
  return getHomeMerchandising().banners.filter(
    banner => String(banner?.placement || "") === placement
  );
}

function merchandisingProduct(summary)
{
  const id = Number(summary?.product_id || summary?.id || 0);
  return getProductById(id) || null;
}

function merchandisingCampaignProducts(campaign)
{
  if (!Array.isArray(campaign?.products))
  {
    return [];
  }

  const seen = new Set();

  return campaign.products
    .map(merchandisingProduct)
    .filter(product => {
      if (!product || seen.has(Number(product.id)))
      {
        return false;
      }

      seen.add(Number(product.id));
      return true;
    });
}

function renderMerchandisingCta(target, label, className = "btn")
{
  const safeLabel = String(label || "Descubrir colección").trim();
  const safeTarget = String(target || "").trim();

  if (/^https?:\/\//i.test(safeTarget))
  {
    return `
      <a
        class="${escapeAttribute(className)}"
        href="${escapeAttribute(safeTarget)}"
        target="_blank"
        rel="noopener noreferrer">
        ${escapeHtml(safeLabel)}
        <span aria-hidden="true">→</span>
      </a>
    `;
  }

  if (/^product:\d+$/i.test(safeTarget))
  {
    const id = Number(safeTarget.split(":")[1]);

    return `
      <button
        class="${escapeAttribute(className)}"
        type="button"
        data-route="product"
        data-product-id="${id}">
        ${escapeHtml(safeLabel)}
        <span aria-hidden="true">→</span>
      </button>
    `;
  }

  if (/^collection:/i.test(safeTarget))
  {
    const slug = safeTarget.slice("collection:".length).trim();

    return `
      <button
        class="${escapeAttribute(className)}"
        type="button"
        data-route="collection"
        data-collection-slug="${escapeAttribute(slug)}">
        ${escapeHtml(safeLabel)}
        <span aria-hidden="true">→</span>
      </button>
    `;
  }

  if (/^campaign:/i.test(safeTarget))
  {
    const slug = safeTarget.slice("campaign:".length).trim();

    return `
      <button
        class="${escapeAttribute(className)}"
        type="button"
        data-route="campaign"
        data-campaign-slug="${escapeAttribute(slug)}">
        ${escapeHtml(safeLabel)}
        <span aria-hidden="true">→</span>
      </button>
    `;
  }

  const allowedRoutes = new Set([
    "catalog",
    "best",
    "collections",
    "decants",
    "gifts",
    "games",
    "advisor",
    "about",
    "contact",
  ]);

  const route = allowedRoutes.has(safeTarget)
    ? safeTarget
    : "catalog";

  return `
    <button
      class="${escapeAttribute(className)}"
      type="button"
      data-route="${escapeAttribute(route)}">
      ${escapeHtml(safeLabel)}
      <span aria-hidden="true">→</span>
    </button>
  `;
}

function renderMerchandisingPicture(desktopUrl, mobileUrl, alt)
{
  const desktop = String(desktopUrl || "").trim();
  const mobile = String(mobileUrl || "").trim();

  if (!desktop && !mobile)
  {
    return "";
  }

  return `
    <picture>
      ${mobile
        ? `<source media="(max-width: 760px)" srcset="${escapeAttribute(mobile)}">`
        : ""
      }
      <img
        src="${escapeAttribute(desktop || mobile)}"
        alt="${escapeAttribute(alt || "AromaLParfum")}" 
        loading="eager"
        decoding="async">
    </picture>
  `;
}

function renderDynamicHomeHero(fallbackCollection, fallbackProduct, fallbackCollections)
{
  const banner = getHomeBanners("home_hero")[0];

  if (!banner)
  {
    return renderHero(
      fallbackCollection,
      fallbackProduct,
      fallbackCollections
    );
  }

  const desktop = banner.resolved_image || "";
  const mobile = banner.resolved_mobile_image || "";
  const hasMedia = Boolean(desktop || mobile);

  return `
    <section class="merch-hero ${hasMedia ? "has-media" : ""}">
      ${hasMedia
        ? `
          <div class="merch-hero-media" aria-hidden="true">
            ${renderMerchandisingPicture(desktop, mobile, banner.title)}
          </div>
        `
        : ""
      }

      <div class="merch-hero-shade"></div>

      <div class="container merch-hero-inner">
        <div class="merch-hero-copy">
          ${banner.eyebrow
            ? `<p class="eyebrow">${escapeHtml(banner.eyebrow)}</p>`
            : ""
          }

          <h1>${escapeHtml(banner.title || t("hero.title"))}</h1>

          ${banner.subtitle
            ? `<p>${escapeHtml(banner.subtitle)}</p>`
            : ""
          }

          <div class="merch-hero-actions">
            ${renderMerchandisingCta(
              banner.cta_target,
              banner.cta_label || "Descubrir colección"
            )}

            <button
              class="btn secondary"
              type="button"
              data-route="advisor">
              Encontrá tu perfume
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderWeeklyFragrance()
{
  const weekly = getHomeMerchandising().weekly_fragrance;

  if (!weekly)
  {
    return "";
  }

  const product = merchandisingProduct(weekly);

  if (!product)
  {
    return "";
  }

  const image = getProductMainImage(product) || weekly.image || "";
  const family = localizedField(product, "familia") || weekly.family || "";
  const seasons = localizedField(product, "estaciones") || weekly.seasons || "";

  return `
    <section class="section weekly-fragrance-section">
      <div class="container">
        <article class="weekly-fragrance-card">
          <div class="weekly-fragrance-media">
            ${image
              ? `
                <img
                  src="${escapeAttribute(image)}"
                  alt="${escapeAttribute(product.nombre)}"
                  loading="lazy"
                  decoding="async">
              `
              : `<div class="weekly-fragrance-fallback">${escapeHtml(product.nombre)}</div>`
            }
          </div>

          <div class="weekly-fragrance-copy">
            <p class="eyebrow">
              ${escapeHtml(weekly.badge || weekly.title || "Fragancia de la semana")}
            </p>

            <h2>${escapeHtml(product.nombre)}</h2>

            ${product.marca
              ? `<p class="weekly-fragrance-brand">${escapeHtml(product.marca)}</p>`
              : ""
            }

            ${weekly.subtitle
              ? `<p class="weekly-fragrance-subtitle">${escapeHtml(weekly.subtitle)}</p>`
              : ""
            }

            ${weekly.description
              ? `<p class="weekly-fragrance-description">${escapeHtml(weekly.description)}</p>`
              : ""
            }

            <div class="weekly-fragrance-meta">
              ${family
                ? `<span>${escapeHtml(family)}</span>`
                : ""
              }

              ${seasons
                ? `<span>${escapeHtml(seasons)}</span>`
                : ""
              }
            </div>

            <div class="weekly-fragrance-bottom">
              <strong>${money(product.precio)}</strong>

              <button
                class="btn"
                type="button"
                data-route="product"
                data-product-id="${Number(product.id)}">
                ${escapeHtml(weekly.cta_label || "Descubrir fragancia")}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCampaignEditorial(campaign)
{
  const desktop = campaign.resolved_image || "";
  const mobile = campaign.resolved_mobile_image || "";
  const hasMedia = Boolean(desktop || mobile);
  const configuredTarget = String(campaign.cta_target || "").trim();
  const campaignSlug = String(campaign.slug || "").trim();
  const campaignLandingEnabled = campaign.landing_enabled !== false;
  const effectiveTarget = campaignLandingEnabled && campaignSlug && (!configuredTarget || configuredTarget === "catalog")
    ? `campaign:${campaignSlug}`
    : configuredTarget;

  return `
    <article class="campaign-editorial ${hasMedia ? "has-media" : ""}">
      ${hasMedia
        ? `
          <div class="campaign-editorial-media">
            ${renderMerchandisingPicture(
              desktop,
              mobile,
              campaign.title || campaign.name
            )}
          </div>
        `
        : ""
      }

      <div class="campaign-editorial-copy">
        ${campaign.eyebrow
          ? `<p class="eyebrow">${escapeHtml(campaign.eyebrow)}</p>`
          : ""
        }

        <h2>${escapeHtml(campaign.title || campaign.name || "AromaLParfum")}</h2>

        ${campaign.subtitle
          ? `<p class="campaign-editorial-subtitle">${escapeHtml(campaign.subtitle)}</p>`
          : ""
        }

        ${campaign.description
          ? `<p>${escapeHtml(campaign.description)}</p>`
          : ""
        }

        ${campaign.badge
          ? `<span class="campaign-badge">${escapeHtml(campaign.badge)}</span>`
          : ""
        }

        <div class="campaign-editorial-actions">
          ${renderMerchandisingCta(
            effectiveTarget,
            campaign.cta_label || "Descubrir colección"
          )}
        </div>
      </div>
    </article>
  `;
}

function renderHomeCampaigns()
{
  const campaigns = getHomeMerchandising().campaigns
    .slice()
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 3);

  if (!campaigns.length)
  {
    return "";
  }

  return campaigns
    .map(campaign => {
      const products = merchandisingCampaignProducts(campaign).slice(0, 10);

      return `
        <section class="section home-campaign-section">
          <div class="container">
            ${renderCampaignEditorial(campaign)}

            ${products.length
              ? `
                <div class="home-campaign-products">
                  <div class="product-row-scroller">
                    ${products.map(product => renderProductCard(product)).join("")}
                  </div>
                </div>
              `
              : ""
            }
          </div>
        </section>
      `;
    })
    .join("");
}

function renderHomeSecondaryBanners()
{
  const banners = getHomeBanners("home_secondary").slice(0, 3);

  if (!banners.length)
  {
    return "";
  }

  return `
    <section class="section home-secondary-banners">
      <div class="container">
        <div class="home-secondary-banner-grid">
          ${banners.map(banner => {
            const desktop = banner.resolved_image || "";
            const mobile = banner.resolved_mobile_image || "";
            const hasMedia = Boolean(desktop || mobile);

            return `
              <article class="home-secondary-banner ${hasMedia ? "has-media" : ""}">
                ${hasMedia
                  ? `
                    <div class="home-secondary-banner-media">
                      ${renderMerchandisingPicture(desktop, mobile, banner.title)}
                    </div>
                  `
                  : ""
                }

                <div class="home-secondary-banner-shade"></div>

                <div class="home-secondary-banner-copy">
                  ${banner.eyebrow
                    ? `<p class="eyebrow">${escapeHtml(banner.eyebrow)}</p>`
                    : ""
                  }

                  <h3>${escapeHtml(banner.title || "AromaLParfum")}</h3>

                  ${banner.subtitle
                    ? `<p>${escapeHtml(banner.subtitle)}</p>`
                    : ""
                  }

                  ${renderMerchandisingCta(
                    banner.cta_target,
                    banner.cta_label || "Descubrir",
                    "text-link merch-banner-link"
                  )}
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

// Sobrescribe renderHomePage() del módulo store.js de forma intencional.
// Conserva todas las secciones existentes y agrega merchandising dinámico.
function renderHomePage()
{
  const heroCollections = getHeroCollections();

  const safeHeroIndex = clamp(
    state.heroCollectionIndex,
    0,
    Math.max(0, heroCollections.length - 1)
  );

  state.heroCollectionIndex = safeHeroIndex;

  const heroCollection = heroCollections[safeHeroIndex];
  const heroProduct = getHeroProductForCollection(heroCollection);

  const featured = getFeaturedProducts().slice(0, 10);
  const newProducts = getNewProducts().slice(0, 10);
  const best = getBestSellerProducts()
    .filter(product => getPopularity(product.id) > 0)
    .slice(0, 10);

  return `
    ${renderDynamicHomeHero(heroCollection, heroProduct, heroCollections)}

    ${renderCategoryRail()}

    ${renderWeeklyFragrance()}

    ${renderHomeCampaigns()}

    ${renderHomeSecondaryBanners()}

    ${renderSeasonalVideo()}

    ${renderProductRowSection(
      t("featured.eyebrow"),
      t("featured.title"),
      featured,
      {
        route: "catalog",
        actionLabel: t("featured.viewall"),
        badge: "featured",
      }
    )}

    ${renderProductRowSection(
      t("new.eyebrow"),
      t("new.title"),
      newProducts,
      {
        route: "catalog",
        filter: "Nuevo",
        badge: "new",
      }
    )}

    ${best.length
      ? renderProductRowSection(
          t("best.eyebrow"),
          t("best.title"),
          best,
          {
            route: "best",
            badge: "best",
            description: t("best.description"),
          }
        )
      : ""
    }

    ${renderPromoBuilders()}

    ${renderAdvisorTeaser()}

    ${renderServiceStrip()}
  `;
}
