"use strict";

// AromaLParfum Frontend V2 — Paso 45
// Carrito inteligente: recomendaciones complementarias + barra móvil flotante.

const ALP45_RECOMMENDATION_CACHE_MS = 60 * 1000;
const alp45RecommendationCache = new Map();
let alp45RecommendationRequest = 0;

function cart45GetConfig()
{
  const saved = typeof getSiteSettingObject === "function"
    ? getSiteSettingObject("cart_experience")
    : {};

  return {
    enabled: saved.enabled !== false,
    floating_mobile: saved.floating_mobile !== false,
    show_item_count: saved.show_item_count !== false,
    show_total: saved.show_total !== false,
    recommendations_enabled: saved.recommendations_enabled !== false,
    recommendation_limit: Math.min(2, Math.max(1, Number(saved.recommendation_limit || 2))),
    recommendation_min_score: Math.max(0, Number(saved.recommendation_min_score || 20)),
    hide_recommendations_after_cart_items: Math.max(1, Number(saved.hide_recommendations_after_cart_items || 6)),
    exclude_products_already_in_cart: saved.exclude_products_already_in_cart !== false,
    exclude_out_of_stock: saved.exclude_out_of_stock !== false,
  };
}

function cart45GetItemCount()
{
  return state.cart.reduce((total, line) => {
    return total + Math.max(1, asNumber(line.qty, 1));
  }, 0);
}

function cart45GetProductIds()
{
  const ids = new Set();

  for (const line of state.cart)
  {
    if (line.kind === "product")
    {
      const id = Number(line.productId ?? line.id);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }

    if (Array.isArray(line.items))
    {
      for (const item of line.items)
      {
        const id = Number(item?.productId);
        if (Number.isFinite(id) && id > 0) ids.add(id);
      }
    }
  }

  return Array.from(ids).slice(0, 20);
}

function cart45EnsureFloatingBar()
{
  if (document.body?.dataset.entry === "admin") return null;

  let host = document.getElementById("cart45Floating");

  if (!host)
  {
    host = document.createElement("div");
    host.id = "cart45Floating";
    host.className = "cart45-floating is-hidden";
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = `
      <button class="cart45-floating-button" type="button" data-action="open-cart" aria-label="Abrir carrito">
        <span class="cart45-floating-icon" aria-hidden="true">🛍</span>
        <span class="cart45-floating-copy">
          <small data-cart45-label>Tu carrito</small>
          <strong data-cart45-summary>0 productos · ${money(0)}</strong>
        </span>
        <span class="cart45-floating-cta" data-cart45-cta>Ver carrito</span>
      </button>
    `;

    document.body.appendChild(host);
  }

  return host;
}

function cart45UpdateFloatingBar()
{
  const config = cart45GetConfig();
  const host = cart45EnsureFloatingBar();

  if (!host) return;

  const count = cart45GetItemCount();
  const subtotal = Math.max(0, Number(getCartSubtotal?.() || 0));
  const shouldShow = config.enabled && config.floating_mobile && count > 0;

  host.classList.toggle("is-hidden", !shouldShow);
  host.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  document.body.classList.toggle("cart45-has-floating", shouldShow);

  const label = host.querySelector("[data-cart45-label]");
  const summary = host.querySelector("[data-cart45-summary]");
  const cta = host.querySelector("[data-cart45-cta]");

  if (label)
  {
    label.textContent = state.language === "en" ? "Your cart" : "Tu carrito";
  }

  if (summary)
  {
    const countText = state.language === "en"
      ? `${count} ${count === 1 ? "item" : "items"}`
      : `${count} ${count === 1 ? "producto" : "productos"}`;

    const parts = [];
    if (config.show_item_count) parts.push(countText);
    if (config.show_total) parts.push(money(subtotal));
    summary.textContent = parts.join(" · ") || money(subtotal);
  }

  if (cta)
  {
    cta.textContent = state.language === "en" ? "View cart" : "Ver carrito";
  }
}

function cart45RenderRecommendationLoading(host)
{
  host.innerHTML = `
    <section class="cart45-recommendations" aria-label="Recomendaciones para tu carrito">
      <div class="cart45-rec-head">
        <div>
          <small>${state.language === "en" ? "A small complement" : "Un complemento, sin llenar tu carrito"}</small>
          <h3>${state.language === "en" ? "You may also like" : "También podría gustarte"}</h3>
        </div>
      </div>
      <div class="cart45-rec-loading">
        <span></span><span></span>
      </div>
    </section>
  `;
}

function cart45RenderRecommendations(host, recommendations)
{
  if (!recommendations.length)
  {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `
    <section class="cart45-recommendations" aria-label="Recomendaciones para tu carrito">
      <div class="cart45-rec-head">
        <div>
          <small>${state.language === "en" ? "Selected for your cart" : "Elegidos según tu carrito"}</small>
          <h3>${state.language === "en" ? "You may also like" : "También podría gustarte"}</h3>
        </div>
        <span>${recommendations.length}/2</span>
      </div>
      <div class="cart45-rec-list">
        ${recommendations.map(item => {
          const product = item.product;
          const image = getProductMainImage(product);
          const reason = String(item.reason || "");
          const meta = [product.marca, product.familia].filter(Boolean).join(" · ");

          return `
            <article class="cart45-rec-card">
              <button
                class="cart45-rec-image"
                type="button"
                data-route="product"
                data-product-id="${escapeAttribute(product.id)}"
                aria-label="${escapeAttribute(product.nombre)}">
                ${image
                  ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.nombre)}" loading="lazy">`
                  : `<span>✦</span>`}
              </button>

              <div class="cart45-rec-copy">
                <button
                  class="cart45-rec-title"
                  type="button"
                  data-route="product"
                  data-product-id="${escapeAttribute(product.id)}">
                  ${escapeHtml(product.nombre)}
                </button>
                ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
                ${reason ? `<p>${escapeHtml(reason)}</p>` : ""}
              </div>

              <div class="cart45-rec-action">
                <strong>${money(product.precio)}</strong>
                <button
                  class="cart45-rec-add"
                  type="button"
                  data-action="add-product"
                  data-product-id="${escapeAttribute(product.id)}">
                  ${state.language === "en" ? "Add" : "Agregar"}
                </button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

async function cart45FetchRecommendations(productIds, config)
{
  const cacheKey = `${productIds.slice().sort((a, b) => a - b).join(",")}|${config.recommendation_limit}`;
  const cached = alp45RecommendationCache.get(cacheKey);

  if (cached && Date.now() - cached.time < ALP45_RECOMMENDATION_CACHE_MS)
  {
    return cached.items;
  }

  const result = await supabaseClient.rpc("get_cart_recommendations", {
    p_product_ids: productIds,
    p_limit: config.recommendation_limit,
  });

  if (result.error)
  {
    throw new Error(result.error.message || "No se pudieron cargar las recomendaciones.");
  }

  const raw = Array.isArray(result.data) ? result.data : [];
  const cartIds = new Set(productIds.map(Number));
  const items = raw
    .map(row => {
      const id = Number(row.recommended_product_id);
      const product = getProductById(id);
      const score = Number(row.recommendation_score || 0);

      if (!product) return null;
      if (config.exclude_products_already_in_cart && cartIds.has(Number(product.id))) return null;
      if (config.exclude_out_of_stock && Number(product.stock || 0) <= 0) return null;
      if (score < config.recommendation_min_score) return null;

      return {
        product,
        score,
        reason: row.recommendation_reason || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.recommendation_limit);

  alp45RecommendationCache.set(cacheKey, {
    time: Date.now(),
    items,
  });

  return items;
}

async function cart45RefreshRecommendations()
{
  const host = document.getElementById("cart45Recommendations");
  if (!host) return;

  const config = cart45GetConfig();
  const count = cart45GetItemCount();
  const productIds = cart45GetProductIds();

  if (
    !config.enabled ||
    !config.recommendations_enabled ||
    count >= config.hide_recommendations_after_cart_items ||
    !productIds.length
  )
  {
    host.innerHTML = "";
    return;
  }

  const requestId = ++alp45RecommendationRequest;
  cart45RenderRecommendationLoading(host);

  try
  {
    const items = await cart45FetchRecommendations(productIds, config);

    if (requestId !== alp45RecommendationRequest) return;
    if (!document.getElementById("cart45Recommendations")) return;

    cart45RenderRecommendations(host, items);
  }
  catch (error)
  {
    if (requestId !== alp45RecommendationRequest) return;
    console.warn("Carrito inteligente:", error?.message || error);
    host.innerHTML = "";
  }
}

// Se puede llamar al cargar el script; el body ya existe porque los scripts están al final.
cart45EnsureFloatingBar();
cart45UpdateFloatingBar();
