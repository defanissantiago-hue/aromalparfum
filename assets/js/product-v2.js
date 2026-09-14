"use strict";

// AromaLParfum Frontend V2 — Paso 62
// Ficha de producto V2 + similares + vistos recientemente + comparador

const PRODUCT_V2_COMPARE_KEY = "alp_compare_v1";
const PRODUCT_V2_RECENT_FALLBACK_KEY = "alp_recently_viewed_v1";
const PRODUCT_V2_MAX_COMPARE = 3;

const productV2State =
{
  similarByProduct: new Map(),
  historyRecommendations: [],
  compareIds: productV2ReadStoredIds(PRODUCT_V2_COMPARE_KEY, PRODUCT_V2_MAX_COMPARE),
  activeProductId: null,
  loadingProductId: null,
};

function productV2ReadStoredIds(key, maxItems = 20)
{
  try
  {
    const raw = safeJsonParse(localStorage.getItem(key), []);

    if (!Array.isArray(raw))
    {
      return [];
    }

    return raw
      .map(item => Number(item?.id ?? item))
      .filter(id => Number.isFinite(id) && id > 0)
      .filter((id, index, array) => array.indexOf(id) === index)
      .slice(0, maxItems);
  }
  catch (error)
  {
    return [];
  }
}

function productV2RecentConfig()
{
  const settings = getSiteSettingObject("recently_viewed");

  return {
    enabled: settings.enabled !== false,
    maxItems: clamp(asNumber(settings.max_items, 8), 1, 20),
    maxDays: clamp(asNumber(settings.max_days, 30), 1, 365),
    storageKey: String(settings.storage_key || PRODUCT_V2_RECENT_FALLBACK_KEY),
    showProduct: settings.show_product !== false,
  };
}

function productV2ReadRecentEntries()
{
  const config = productV2RecentConfig();
  const cutoff = Date.now() - (config.maxDays * 86400000);

  try
  {
    const raw = safeJsonParse(localStorage.getItem(config.storageKey), []);

    if (!Array.isArray(raw))
    {
      return [];
    }

    return raw
      .map(item =>
      {
        if (typeof item === "number" || typeof item === "string")
        {
          return {
            id: Number(item),
            viewedAt: Date.now(),
          };
        }

        return {
          id: Number(item?.id ?? item?.productId ?? 0),
          viewedAt: asNumber(item?.viewedAt ?? item?.viewed_at, Date.now()),
        };
      })
      .filter(item => item.id > 0 && item.viewedAt >= cutoff)
      .filter((item, index, array) => array.findIndex(candidate => candidate.id === item.id) === index)
      .slice(0, config.maxItems);
  }
  catch (error)
  {
    return [];
  }
}

function productV2SaveRecentEntries(entries)
{
  const config = productV2RecentConfig();

  try
  {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify(entries.slice(0, config.maxItems))
    );
  }
  catch (error)
  {
    console.debug("No se pudo guardar vistos recientemente", error);
  }
}

function productV2RecordView(productId)
{
  const config = productV2RecentConfig();

  if (!config.enabled)
  {
    return;
  }

  const id = Number(productId);

  if (!id)
  {
    return;
  }

  const entries = productV2ReadRecentEntries()
    .filter(item => item.id !== id);

  entries.unshift({
    id,
    viewedAt: Date.now(),
  });

  productV2SaveRecentEntries(entries);
}

function productV2RecentProducts(excludeProductId = 0)
{
  const exclude = Number(excludeProductId || 0);

  return productV2ReadRecentEntries()
    .map(item => getProductById(item.id))
    .filter(Boolean)
    .filter(product => Number(product.id) !== exclude);
}

function productV2CompareContains(productId)
{
  return productV2State.compareIds.includes(Number(productId));
}

function productV2PersistCompare()
{
  try
  {
    localStorage.setItem(
      PRODUCT_V2_COMPARE_KEY,
      JSON.stringify(productV2State.compareIds)
    );
  }
  catch (error)
  {
    console.debug("No se pudo guardar el comparador", error);
  }
}

function productV2ToggleCompare(productId)
{
  const id = Number(productId);
  const product = getProductById(id);

  if (!product)
  {
    return;
  }

  if (productV2CompareContains(id))
  {
    productV2State.compareIds = productV2State.compareIds.filter(itemId => itemId !== id);
    toast(
      state.language === "en" ? "Removed from comparison." : "Quitado del comparador.",
      "success"
    );
  }
  else
  {
    if (productV2State.compareIds.length >= PRODUCT_V2_MAX_COMPARE)
    {
      toast(
        state.language === "en"
          ? "You can compare up to 3 fragrances."
          : "Podés comparar hasta 3 perfumes.",
        "error"
      );
      return;
    }

    productV2State.compareIds.push(id);
    toast(
      state.language === "en" ? "Added to comparison." : "Agregado al comparador.",
      "success"
    );
  }

  productV2PersistCompare();
  productV2RefreshCompareButtons();
  productV2RenderCompareDock();
}

function productV2ClearCompare()
{
  productV2State.compareIds = [];
  productV2PersistCompare();
  productV2RefreshCompareButtons();
  productV2RenderCompareDock();
}

function productV2RefreshCompareButtons()
{
  document.querySelectorAll('[data-action="product-v2-compare-toggle"]').forEach(button =>
  {
    const id = Number(button.dataset.productId || 0);
    const selected = productV2CompareContains(id);

    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");

    const label = button.querySelector("[data-compare-label]");

    if (label)
    {
      label.textContent = selected
        ? (state.language === "en" ? "Comparing" : "Comparando")
        : (state.language === "en" ? "Compare" : "Comparar");
    }
  });
}

function productV2RenderCompareDock()
{
  if (document.body?.dataset.entry === "admin")
  {
    document.getElementById("productCompareDock")?.remove();
    return;
  }

  const products = productV2State.compareIds
    .map(id => getProductById(id))
    .filter(Boolean)
    .slice(0, PRODUCT_V2_MAX_COMPARE);

  productV2State.compareIds = products.map(product => Number(product.id));
  productV2PersistCompare();

  let dock = document.getElementById("productCompareDock");

  if (!products.length)
  {
    dock?.remove();
    return;
  }

  if (!dock)
  {
    dock = document.createElement("aside");
    dock.id = "productCompareDock";
    dock.className = "product-compare-dock";
    document.body.appendChild(dock);
  }

  dock.innerHTML = `
    <div class="product-compare-dock__copy">
      <strong>${state.language === "en" ? "Compare fragrances" : "Compará perfumes"}</strong>
      <span>${products.length}/${PRODUCT_V2_MAX_COMPARE}</span>
    </div>

    <div class="product-compare-dock__items">
      ${products.map(product => `
        <button
          class="product-compare-chip"
          type="button"
          data-action="product-v2-compare-toggle"
          data-product-id="${product.id}"
          title="${escapeAttribute(state.language === "en" ? "Remove" : "Quitar")}">
          <span>${escapeHtml(product.nombre)}</span>
          <b>×</b>
        </button>
      `).join("")}
    </div>

    <div class="product-compare-dock__actions">
      <button
        class="btn outline compact"
        type="button"
        data-action="product-v2-compare-clear">
        ${state.language === "en" ? "Clear" : "Limpiar"}
      </button>

      <button
        class="btn compact"
        type="button"
        data-action="product-v2-compare-open"
        ${products.length < 2 ? "disabled" : ""}>
        ${state.language === "en" ? "Compare now" : "Comparar ahora"}
      </button>
    </div>
  `;
}

async function productV2RpcWithVariants(functionName, variants)
{
  let lastError = null;

  for (const params of variants)
  {
    try
    {
      const result = await supabaseClient.rpc(functionName, params);

      if (!result.error)
      {
        return {
          data: Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []),
          error: null,
        };
      }

      lastError = result.error;
    }
    catch (error)
    {
      lastError = error;
    }
  }

  return {
    data: [],
    error: lastError,
  };
}

function productV2ResolveProductId(row)
{
  const direct = Number(
    row?.recommended_product_id ??
    row?.product_id ??
    row?.id ??
    row?.recommended_id ??
    0
  );

  if (direct > 0)
  {
    return direct;
  }

  const name = normalizeText(row?.product_name ?? row?.name ?? row?.nombre ?? "");
  const brand = normalizeText(row?.brand ?? row?.marca ?? "");

  if (!name)
  {
    return 0;
  }

  const product = state.products.find(item =>
  {
    const sameName = normalizeText(item.nombre) === name;
    const sameBrand = !brand || normalizeText(item.marca) === brand;
    return sameName && sameBrand;
  });

  return Number(product?.id || 0);
}

function productV2LocalSimilarity(productId, limit = 6)
{
  const product = getProductById(productId);

  if (!product)
  {
    return [];
  }

  const seasons = new Set(arrayFromDb(product.estaciones).map(normalizeText));
  const occasions = new Set(arrayFromDb(product.ocasiones).map(normalizeText));
  const family = normalizeText(localizedField(product, "familia"));
  const gender = normalizeText(product.genero);
  const category = normalizeText(product.categoria);
  const price = asNumber(product.precio, 0);

  return state.products
    .filter(candidate => Number(candidate.id) !== Number(product.id))
    .filter(candidate => asNumber(candidate.stock, 0) > 0)
    .map(candidate =>
    {
      let score = 0;
      const candidateFamily = normalizeText(localizedField(candidate, "familia"));
      const candidateGender = normalizeText(candidate.genero);
      const candidateCategory = normalizeText(candidate.categoria);
      const candidateSeasons = arrayFromDb(candidate.estaciones).map(normalizeText);
      const candidateOccasions = arrayFromDb(candidate.ocasiones).map(normalizeText);

      if (family && candidateFamily === family) score += 6;
      if (gender && candidateGender === gender) score += 3;
      if (category && candidateCategory === category) score += 2;
      if (candidateSeasons.some(value => seasons.has(value))) score += 2;
      if (candidateOccasions.some(value => occasions.has(value))) score += 2;

      if (price > 0)
      {
        const difference = Math.abs(asNumber(candidate.precio, 0) - price) / price;
        if (difference <= 0.20) score += 2;
        else if (difference <= 0.40) score += 1;
      }

      score += Math.min(getPopularity(candidate.id), 5) * 0.2;

      return {
        product: candidate,
        score,
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);
}

async function productV2LoadSimilar(productId, limit = 6)
{
  const id = Number(productId);

  if (productV2State.similarByProduct.has(id))
  {
    return productV2State.similarByProduct.get(id);
  }

  const rpc = await productV2RpcWithVariants(
    "get_similar_products",
    [
      { p_product_id: id, p_limit: limit },
      { product_id: id, limit_count: limit },
      { p_id: id, p_limit: limit },
    ]
  );

  const remote = rpc.data
    .map(productV2ResolveProductId)
    .filter(candidateId => candidateId > 0 && candidateId !== id)
    .map(candidateId => getProductById(candidateId))
    .filter(Boolean)
    .filter((product, index, array) => array.findIndex(item => item.id === product.id) === index)
    .slice(0, limit);

  const products = remote.length
    ? remote
    : productV2LocalSimilarity(id, limit);

  productV2State.similarByProduct.set(id, products);

  return products;
}

async function productV2LoadHistoryRecommendations(currentProductId, limit = 6)
{
  const recentIds = productV2ReadRecentEntries()
    .map(item => item.id)
    .filter(id => id !== Number(currentProductId))
    .slice(0, 8);

  if (!recentIds.length)
  {
    productV2State.historyRecommendations = [];
    return [];
  }

  const rpc = await productV2RpcWithVariants(
    "get_recently_viewed_recommendations",
    [
      { p_recent_product_ids: recentIds, p_limit: limit },
      { p_product_ids: recentIds, p_limit: limit },
      { product_ids: recentIds, limit_count: limit },
    ]
  );

  let products = rpc.data
    .map(productV2ResolveProductId)
    .filter(id => id > 0 && id !== Number(currentProductId) && !recentIds.includes(id))
    .map(id => getProductById(id))
    .filter(Boolean)
    .filter((product, index, array) => array.findIndex(item => item.id === product.id) === index)
    .slice(0, limit);

  if (!products.length)
  {
    products = productV2LocalSimilarity(recentIds[0], limit)
      .filter(product => Number(product.id) !== Number(currentProductId))
      .filter(product => !recentIds.includes(Number(product.id)))
      .slice(0, limit);
  }

  productV2State.historyRecommendations = products;

  return products;
}

function productV2ProductRow(title, subtitle, products, emptyText = "")
{
  if (!products.length)
  {
    return emptyText
      ? `<div class="product-v2-empty">${escapeHtml(emptyText)}</div>`
      : "";
  }

  return `
    <div class="product-v2-section-head">
      <div>
        <p class="eyebrow">AromaLParfum</p>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </div>

    <div class="product-v2-related-grid">
      ${products.map(product => renderProductCard(product)).join("")}
    </div>
  `;
}

function productV2RenderRecentHost(currentProductId)
{
  const host = document.getElementById("productRecentHost");

  if (!host)
  {
    return;
  }

  const products = productV2RecentProducts(currentProductId).slice(0, 4);

  if (!products.length)
  {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }

  host.hidden = false;
  host.innerHTML = productV2ProductRow(
    state.language === "en" ? "Recently viewed" : "Vistos recientemente",
    state.language === "en"
      ? "Continue exploring fragrances you opened before."
      : "Volvé rápido a los perfumes que estuviste mirando.",
    products
  );
}

function productV2RenderSimilarHost(products)
{
  const host = document.getElementById("productSimilarHost");

  if (!host)
  {
    return;
  }

  host.innerHTML = productV2ProductRow(
    state.language === "en" ? "If you like this, try..." : "Si te gusta este, probá…",
    state.language === "en"
      ? "Fragrances related by style, family, occasion and price."
      : "Fragancias relacionadas por estilo, familia, ocasión y rango de precio.",
    products,
    state.language === "en" ? "No similar fragrances found yet." : "Todavía no encontramos similares."
  );
}

function productV2RenderHistoryRecommendationHost(products)
{
  const host = document.getElementById("productHistoryRecommendationHost");

  if (!host)
  {
    return;
  }

  if (!products.length)
  {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }

  host.hidden = false;
  host.innerHTML = productV2ProductRow(
    state.language === "en" ? "Based on what you viewed" : "Según lo que estuviste mirando",
    state.language === "en"
      ? "A more personal selection from your recent browsing."
      : "Una selección más personal basada en tu navegación reciente.",
    products
  );
}

async function productV2AfterRender(productId)
{
  const id = Number(productId);

  if (!id || !getProductById(id))
  {
    return;
  }

  productV2State.activeProductId = id;
  productV2RecordView(id);
  productV2RenderRecentHost(id);
  productV2RenderCompareDock();
  productV2RefreshCompareButtons();

  productV2State.loadingProductId = id;

  const [similar, historyRecommendations] = await Promise.all([
    productV2LoadSimilar(id, 6),
    productV2LoadHistoryRecommendations(id, 6),
  ]);

  if (
    state.route !== "product" ||
    Number(state.routePayload?.id) !== id ||
    productV2State.loadingProductId !== id
  )
  {
    return;
  }

  productV2RenderSimilarHost(similar);
  productV2RenderHistoryRecommendationHost(historyRecommendations);
}

function productV2AfterRouteRender()
{
  productV2RenderCompareDock();
  productV2RefreshCompareButtons();
}

function productV2ChipList(values)
{
  const list = arrayFromDb(values).filter(Boolean);

  if (!list.length)
  {
    return `<span class="product-v2-muted">${escapeHtml(t("common.consult"))}</span>`;
  }

  return `
    <div class="product-v2-chip-list">
      ${list.map(value => `<span>${escapeHtml(value)}</span>`).join("")}
    </div>
  `;
}

function productV2Feature(label, value)
{
  return `
    <div class="product-v2-feature">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || t("common.consult"))}</strong>
    </div>
  `;
}

function renderProductDetailPageV2(id)
{
  const product = getProductById(id);

  if (!product)
  {
    return renderProductDetailPage(id);
  }

  state.selectedProductId = product.id;

  const images = getProductImages(product);
  const mainImage = state.selectedGalleryUrl && images.includes(state.selectedGalleryUrl)
    ? state.selectedGalleryUrl
    : (images[0] || "");

  state.selectedGalleryUrl = mainImage;

  const seasons = arrayFromDb(product.estaciones);
  const occasions = arrayFromDb(product.ocasiones);
  const available = asNumber(product.stock, 0) > 0;
  const comparing = productV2CompareContains(product.id);
  const family = localizedField(product, "familia") || t("common.consult");
  const duration = localizedField(product, "duracion") || t("common.consult");
  const projection = localizedField(product, "proyeccion") || t("common.consult");
  const use = localizedField(product, "recomendacion_uso") || t("common.consult");

  return `
    <section class="section product-v2-page">
      <div class="container">
        <nav class="product-v2-breadcrumb" aria-label="Breadcrumb">
          <button type="button" data-route="home">${state.language === "en" ? "Home" : "Inicio"}</button>
          <span>/</span>
          <button type="button" data-route="catalog">${escapeHtml(t("nav.perfumes"))}</button>
          <span>/</span>
          <span>${escapeHtml(product.nombre)}</span>
        </nav>

        <div class="product-v2-hero">
          <div class="product-v2-gallery-wrap">
            <div class="detail-main-image product-v2-main-image" id="detailMainImage">
              ${mainImage
                ? `<img src="${escapeAttribute(mainImage)}" alt="${escapeAttribute(product.nombre)}" decoding="async">`
                : `<div class="product-placeholder">${escapeHtml(product.nombre)}</div>`
              }
            </div>

            ${images.length > 1
              ? `
                <div class="detail-thumbs product-v2-thumbs">
                  ${images.map(url => `
                    <button
                      class="detail-thumb ${url === mainImage ? "active" : ""}"
                      type="button"
                      data-action="select-gallery-image"
                      data-image-url="${escapeAttribute(url)}">
                      <img src="${escapeAttribute(url)}" alt="" loading="lazy" decoding="async">
                    </button>
                  `).join("")}
                </div>
              `
              : ""
            }
          </div>

          <div class="product-v2-summary">
            <div class="product-v2-meta-line">
              <span>${escapeHtml(product.marca || product.categoria)}</span>
              <span>·</span>
              <span>${escapeHtml(product.genero)}</span>
              ${product.tipo_producto ? `<span>·</span><span>${escapeHtml(product.tipo_producto)}</span>` : ""}
            </div>

            <h1>${escapeHtml(product.nombre)}</h1>

            <div class="product-v2-price-row">
              <strong>${money(product.precio)}</strong>
              ${product.ml ? `<span>${escapeHtml(String(product.ml))} ml</span>` : ""}
            </div>

            <div class="product-v2-stock ${available ? "available" : "out"}">
              <span></span>
              ${available
                ? `${state.language === "en" ? "Available" : "Disponible"} · ${escapeHtml(String(product.stock))} ${state.language === "en" ? "units" : "unidades"}`
                : escapeHtml(t("product.out"))
              }
            </div>

            <p class="product-v2-description">
              ${escapeHtml(localizedField(product, "descripcion") || t("common.consult"))}
            </p>

            <div class="product-v2-primary-actions">
              <button
                class="btn product-v2-buy"
                type="button"
                data-action="add-product"
                data-product-id="${product.id}"
                ${available ? "" : "disabled"}>
                ${escapeHtml(t("product.add"))}
              </button>

              <button
                class="btn outline"
                type="button"
                data-action="toggle-favorite"
                data-product-id="${product.id}">
                ${isFavorite(product.id) ? "♥" : "♡"}
                ${escapeHtml(t("nav.favorites"))}
              </button>

              <button
                class="btn outline product-v2-compare-button ${comparing ? "active" : ""}"
                type="button"
                aria-pressed="${comparing ? "true" : "false"}"
                data-action="product-v2-compare-toggle"
                data-product-id="${product.id}">
                ⇄ <span data-compare-label>${comparing ? (state.language === "en" ? "Comparing" : "Comparando") : (state.language === "en" ? "Compare" : "Comparar")}</span>
              </button>

              <button
                class="btn outline"
                type="button"
                data-seo62-action="share-current"
                aria-label="${state.language === "en" ? "Share fragrance" : "Compartir perfume"}">
                ↗ ${state.language === "en" ? "Share" : "Compartir"}
              </button>
            </div>

            <div class="product-v2-try-decant">
              <div>
                <strong>${state.language === "en" ? "Not sure yet?" : "¿Todavía no estás seguro?"}</strong>
                <span>${state.language === "en" ? "Try the fragrance in a decant before buying the bottle." : "Probá la fragancia en decant antes de comprar la botella."}</span>
              </div>

              <button class="text-link" type="button" data-route="decants">
                ${state.language === "en" ? "Explore decants →" : "Ver decants →"}
              </button>
            </div>

            <div class="product-v2-quick-features">
              ${productV2Feature(state.language === "en" ? "Family" : "Familia", family)}
              ${productV2Feature(state.language === "en" ? "Longevity" : "Duración", duration)}
              ${productV2Feature(state.language === "en" ? "Projection" : "Proyección", projection)}
              ${productV2Feature(state.language === "en" ? "Recommended use" : "Uso recomendado", use)}
            </div>
          </div>
        </div>

        <div class="product-v2-content-grid">
          <section class="product-v2-panel">
            <p class="eyebrow">${state.language === "en" ? "Olfactory pyramid" : "Pirámide olfativa"}</p>
            <h2>${state.language === "en" ? "How it develops" : "Cómo evoluciona"}</h2>

            <div class="product-v2-notes-grid">
              <article>
                <span>01</span>
                <strong>${escapeHtml(t("product.notes.top"))}</strong>
                <p>${escapeHtml(localizedField(product, "salida") || t("common.consult"))}</p>
              </article>

              <article>
                <span>02</span>
                <strong>${escapeHtml(t("product.notes.heart"))}</strong>
                <p>${escapeHtml(localizedField(product, "corazon") || t("common.consult"))}</p>
              </article>

              <article>
                <span>03</span>
                <strong>${escapeHtml(t("product.notes.base"))}</strong>
                <p>${escapeHtml(localizedField(product, "fondo") || t("common.consult"))}</p>
              </article>
            </div>
          </section>

          <aside class="product-v2-panel product-v2-usage-panel">
            <div>
              <span>${state.language === "en" ? "Best seasons" : "Mejores estaciones"}</span>
              ${productV2ChipList(seasons)}
            </div>

            <div>
              <span>${state.language === "en" ? "Best occasions" : "Mejores ocasiones"}</span>
              ${productV2ChipList(occasions)}
            </div>

            <div class="product-v2-detail-list">
              ${renderDetailInfoRow(t("product.brand"), product.marca || t("common.consult"))}
              ${renderDetailInfoRow(t("product.family"), family)}
              ${renderDetailInfoRow(t("product.size"), product.ml ? `${product.ml} ml` : t("common.consult"))}
              ${renderDetailInfoRow(t("product.duration"), duration)}
              ${renderDetailInfoRow(t("product.projection"), projection)}
              ${renderDetailInfoRow(t("product.use"), use)}
            </div>
          </aside>
        </div>

        <section class="product-v2-recommendation-block" id="productSimilarHost">
          <div class="product-v2-loading">
            <span></span>
            ${state.language === "en" ? "Finding similar fragrances..." : "Buscando perfumes similares…"}
          </div>
        </section>

        <section class="product-v2-recommendation-block" id="productHistoryRecommendationHost" hidden></section>
        <section class="product-v2-recommendation-block" id="productRecentHost" hidden></section>
      </div>
    </section>
  `;
}

async function productV2OpenComparator()
{
  const ids = productV2State.compareIds
    .map(Number)
    .filter(id => id > 0)
    .slice(0, PRODUCT_V2_MAX_COMPARE);

  if (ids.length < 2)
  {
    toast(
      state.language === "en"
        ? "Choose at least 2 fragrances to compare."
        : "Elegí al menos 2 perfumes para comparar.",
      "error"
    );
    return;
  }

  openModal(
    state.language === "en" ? "Fragrance comparison" : "Comparador de perfumes",
    `<div class="product-v2-loading"><span></span>${state.language === "en" ? "Preparing comparison..." : "Preparando comparación…"}</div>`
  );

  const rpc = await productV2RpcWithVariants(
    "compare_products",
    [
      { p_product_ids: ids },
      { product_ids: ids },
    ]
  );

  const rowsById = new Map();

  rpc.data.forEach(row =>
  {
    const id = productV2ResolveProductId(row);
    if (id) rowsById.set(id, row);
  });

  const products = ids
    .map(id => getProductById(id))
    .filter(Boolean);

  const body = document.getElementById("modalBody");

  if (!body)
  {
    return;
  }

  body.innerHTML = productV2RenderComparisonTable(products, rowsById);
}

function productV2ComparisonValue(product, row, keys, fallback = "")
{
  for (const key of keys)
  {
    const value = row?.[key];

    if (value !== null && value !== undefined && value !== "")
    {
      if (Array.isArray(value))
      {
        return value.join(", ");
      }

      return String(value);
    }
  }

  return fallback;
}

function productV2RenderComparisonTable(products, rowsById)
{
  const rowDefinitions = [
    {
      label: state.language === "en" ? "Price" : "Precio",
      get: product => money(product.precio),
    },
    {
      label: state.language === "en" ? "Longevity" : "Duración",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["duration", "duracion"], localizedField(product, "duracion") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Projection" : "Proyección",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["projection", "proyeccion"], localizedField(product, "proyeccion") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Family" : "Familia",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["family", "familia"], localizedField(product, "familia") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Best use" : "Uso recomendado",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["recommended_use", "recommendation", "recomendacion_uso"], localizedField(product, "recomendacion_uso") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Seasons" : "Estaciones",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["seasons", "estaciones"], arrayFromDb(product.estaciones).join(", ") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Occasions" : "Ocasiones",
      get: product => productV2ComparisonValue(product, rowsById.get(Number(product.id)), ["occasions", "ocasiones"], arrayFromDb(product.ocasiones).join(", ") || t("common.consult")),
    },
    {
      label: state.language === "en" ? "Rating" : "Valoración",
      get: product =>
      {
        const row = rowsById.get(Number(product.id));
        const rating = row?.average_rating ?? row?.rating ?? row?.review_rating;
        const count = row?.review_count ?? row?.reviews_count ?? 0;

        if (rating === null || rating === undefined || rating === "")
        {
          return state.language === "en" ? "No verified reviews yet" : "Sin reseñas verificadas todavía";
        }

        return `★ ${Number(rating).toFixed(1)}${Number(count) > 0 ? ` (${count})` : ""}`;
      },
    },
  ];

  return `
    <div class="product-v2-compare-modal">
      <div class="product-v2-compare-products">
        <div></div>
        ${products.map(product => `
          <div class="product-v2-compare-product-head">
            ${getProductMainImage(product)
              ? `<img src="${escapeAttribute(getProductMainImage(product))}" alt="${escapeAttribute(product.nombre)}" loading="lazy">`
              : ""
            }
            <strong>${escapeHtml(product.nombre)}</strong>
            <span>${escapeHtml(product.marca || "")}</span>
            <button
              class="text-link"
              type="button"
              data-action="product-v2-compare-toggle"
              data-product-id="${product.id}">
              ${state.language === "en" ? "Remove" : "Quitar"}
            </button>
          </div>
        `).join("")}
      </div>

      ${rowDefinitions.map(definition => `
        <div class="product-v2-compare-row">
          <strong>${escapeHtml(definition.label)}</strong>
          ${products.map(product => `<span>${escapeHtml(definition.get(product))}</span>`).join("")}
        </div>
      `).join("")}
    </div>

    <div class="product-v2-compare-footer">
      <span>${state.language === "en" ? "Compare up to 3 fragrances. Prices and product information come from the current catalog." : "Compará hasta 3 perfumes. Los precios y la información salen del catálogo actual."}</span>
      <button class="btn outline" type="button" data-action="product-v2-compare-clear">
        ${state.language === "en" ? "Clear comparison" : "Vaciar comparador"}
      </button>
    </div>
  `;
}
