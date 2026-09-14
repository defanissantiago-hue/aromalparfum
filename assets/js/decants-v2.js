"use strict";

// AromaLParfum Frontend V2 — Paso 41
// Decants V2 + Probalo Antes + puente Regalos -> Decants -> Regalos

const ALP41_STANDALONE_DRAFT_KEY = "alp_decant_draft_v2";
const ALP41_GIFT_DRAFT_KEY = "alp_gift_builder_v1";

const ALP41_BASE_CALCULATE_DECANT_PRICE = calculateDecantPrice;

function alp41SafeArray(value)
{
  return Array.isArray(value) ? value : [];
}

function alp41LoadBuilderDrafts()
{
  const standalone = safeJsonParse(
    localStorage.getItem(ALP41_STANDALONE_DRAFT_KEY),
    []
  );

  const gift = safeJsonParse(
    localStorage.getItem(ALP41_GIFT_DRAFT_KEY),
    {}
  ) || {};

  state.decantDraft = alp41SafeArray(standalone);
  state.giftDraft = alp41SafeArray(gift.giftDraft);
  state.giftDecantDraft = alp41SafeArray(gift.giftDecantDraft);
  state.decantContext = gift.decantContext === "gift" ? "gift" : "standalone";

  if (gift.selectedGiftOption)
  {
    state.selectedGiftOption = gift.selectedGiftOption;
  }
}

function alp41PersistBuilderDrafts()
{
  localStorage.setItem(
    ALP41_STANDALONE_DRAFT_KEY,
    JSON.stringify(alp41SafeArray(state.decantDraft))
  );

  localStorage.setItem(
    ALP41_GIFT_DRAFT_KEY,
    JSON.stringify({
      giftDraft: alp41SafeArray(state.giftDraft),
      giftDecantDraft: alp41SafeArray(state.giftDecantDraft),
      selectedGiftOption: state.selectedGiftOption || null,
      decantContext: state.decantContext === "gift" ? "gift" : "standalone",
    })
  );
}

function alp41GetActiveDecantDraft()
{
  if (state.decantContext === "gift")
  {
    state.giftDecantDraft = alp41SafeArray(state.giftDecantDraft);
    return state.giftDecantDraft;
  }

  state.decantDraft = alp41SafeArray(state.decantDraft);
  return state.decantDraft;
}

function alp41GetDecantSurcharge()
{
  return Math.max(
    0,
    asNumber(
      getSiteSetting(
        "commerce",
        "decant_surcharge",
        1000
      ),
      1000
    )
  );
}

function alp41GetTryBeforeConfig()
{
  return {
    enabled: Boolean(
      getSiteSetting(
        "try_before_bottle",
        "enabled",
        true
      )
    ),
    creditPercent: Math.max(
      0,
      asNumber(
        getSiteSetting(
          "try_before_bottle",
          "credit_percent",
          100
        ),
        100
      )
    ),
    maxBottleDiscountPercent: Math.max(
      0,
      asNumber(
        getSiteSetting(
          "try_before_bottle",
          "max_bottle_discount_percent",
          20
        ),
        20
      )
    ),
    validityDays: Math.max(
      1,
      asNumber(
        getSiteSetting(
          "try_before_bottle",
          "validity_days",
          60
        ),
        60
      )
    ),
  };
}

calculateDecantPrice = async function calculateDecantPriceV2(productId, ml)
{
  const base = await ALP41_BASE_CALCULATE_DECANT_PRICE(productId, ml);
  return Math.max(0, asNumber(base, 0)) + alp41GetDecantSurcharge();
};

function alp41RenderTryBeforeCard()
{
  const config = alp41GetTryBeforeConfig();

  if (!config.enabled)
  {
    return "";
  }

  const langEn = state.language === "en";

  return `
    <div class="decant-v2-try-card">
      <div class="decant-v2-try-icon">✦</div>
      <div>
        <strong>${langEn ? "Try before the bottle" : "Probalo antes de comprar la botella"}</strong>
        <p>
          ${langEn
            ? `A registered decant purchase can generate a future bottle benefit for up to ${config.validityDays} days, capped at ${config.maxBottleDiscountPercent}% of the bottle value.`
            : `Una compra registrada de decant puede generar un beneficio para pasar luego a la botella durante hasta ${config.validityDays} días, con un tope de ${config.maxBottleDiscountPercent}% del valor de la botella.`
          }
        </p>
      </div>
    </div>
  `;
}

function alp41RenderGiftContextBar()
{
  if (state.decantContext !== "gift")
  {
    return "";
  }

  const option = getCurrentGiftOption();
  const langEn = state.language === "en";

  return `
    <div class="decant-v2-gift-context">
      <div>
        <span class="decant-v2-context-label">${langEn ? "Adding to a gift" : "Agregando al regalo"}</span>
        <strong>${escapeHtml(langEn ? (option.nombre_en || option.nombre_es) : option.nombre_es)}</strong>
        <small>${langEn ? "Your previous gift selection is safely saved." : "Lo que ya elegiste para el regalo quedó guardado."}</small>
      </div>
      <button type="button" class="btn secondary small" data-decant-v2-action="return-gift">
        ${langEn ? "Back to gift" : "Volver al regalo"}
      </button>
    </div>
  `;
}

function alp41RenderDecantBubble()
{
  const draft = alp41GetActiveDecantDraft();
  const langEn = state.language === "en";

  if (!draft.length)
  {
    return `<div class="decant-v2-floating-inner is-empty"></div>`;
  }

  const total = draft.reduce((sum, item) => sum + asNumber(item.price, 0), 0);
  const visible = draft.slice(0, 3);
  const remainder = Math.max(0, draft.length - visible.length);

  return `
    <div class="decant-v2-floating-inner">
      <div class="decant-v2-floating-head">
        <div>
          <span>${draft.length} ${draft.length === 1 ? "decant" : "decants"}</span>
          <strong>${money(total)}</strong>
        </div>
        <span class="decant-v2-floating-kicker">${langEn ? "Your selection" : "Tu selección"}</span>
      </div>

      <div class="decant-v2-floating-items">
        ${visible.map(item => {
          const product = getProductById(item.productId);
          return `
            <span>
              ${escapeHtml(product?.nombre || "Perfume")} · ${item.ml} ml
            </span>
          `;
        }).join("")}
        ${remainder > 0 ? `<span>+${remainder} ${langEn ? "more" : "más"}</span>` : ""}
      </div>

      ${state.decantContext === "gift"
        ? `
          <button type="button" class="btn small" data-decant-v2-action="finish-gift-decants">
            ${langEn ? "Add to gift" : "Agregar al regalo"}
          </button>
        `
        : `
          <button type="button" class="btn small" data-action="add-decant-bundle-to-cart">
            ${langEn ? "Add pack to cart" : "Agregar pack al carrito"}
          </button>
        `
      }
    </div>
  `;
}

function renderDecantBuilderPage()
{
  const template = getDefaultDecantTemplate();
  const products = getDecantEligibleProducts();
  const maxProducts = Math.max(1, asNumber(template.max_productos, 5));
  const surcharge = alp41GetDecantSurcharge();
  const langEn = state.language === "en";

  return `
    <section class="section decant-v2-page">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(t("decants.eyebrow"))}</p>
            <h1 class="section-title">${escapeHtml(t("decants.title"))}</h1>
            <p class="section-subtitle">${escapeHtml(t("decants.description"))}</p>
          </div>
        </div>

        ${alp41RenderGiftContextBar()}
        ${alp41RenderTryBeforeCard()}

        <div class="decant-v2-price-note">
          <span>✓</span>
          <div>
            <strong>${langEn ? "Final decant price" : "Precio final de decant"}</strong>
            <small>
              ${langEn
                ? `${money(surcharge)} configured decant adjustment is already included in every price.`
                : `Cada precio ya incluye el ajuste configurado de ${money(surcharge)} por decant.`
              }
            </small>
          </div>
        </div>

        <div class="builder-layout" data-decant-max="${maxProducts}">
          <div class="builder-panel">
            <div class="decant-v2-toolbar">
              <div>
                <strong>${langEn ? "Build your pack" : "Armá tu pack"}</strong>
                <span>${langEn ? `Choose up to ${maxProducts} samples.` : `Elegí hasta ${maxProducts} muestras.`}</span>
              </div>
              <input
                type="search"
                id="decantV2Search"
                class="search-input decant-v2-search"
                placeholder="${langEn ? "Search perfume..." : "Buscar perfume..."}"
                autocomplete="off">
            </div>

            <div class="builder-list" id="decantV2ProductList">
              ${products.map(product => renderDecantProductRow(product)).join("")}
            </div>
          </div>

          <aside class="builder-panel sticky decant-v2-summary-panel">
            <p class="eyebrow">${escapeHtml(t("decants.selection"))}</p>
            <div id="decantDraftSummary">${renderDecantDraftSummary()}</div>
          </aside>
        </div>
      </div>

      <div id="decantFloatingBubble" class="decant-v2-floating" aria-live="polite">
        ${alp41RenderDecantBubble()}
      </div>
    </section>
  `;
}

function renderDecantDraftSummary()
{
  const draft = alp41GetActiveDecantDraft();
  const langEn = state.language === "en";

  if (!draft.length)
  {
    return `
      <div class="empty-state decant-v2-empty">
        <h3>${escapeHtml(t("decants.empty"))}</h3>
        <p>${langEn ? "Add a perfume and choose the sample size." : "Agregá un perfume y elegí el tamaño de muestra."}</p>
      </div>
    `;
  }

  const total = draft.reduce((sum, item) => sum + asNumber(item.price, 0), 0);

  return `
    <div class="decant-v2-summary-list">
      ${draft.map((item, index) => {
        const product = getProductById(item.productId);
        return `
          <div class="builder-summary-item decant-v2-summary-item">
            <span>
              <strong>${escapeHtml(product?.nombre || "Perfume")}</strong>
              <small>${item.ml} ml</small>
            </span>
            <span>
              ${money(item.price)}
              <button
                type="button"
                class="decant-v2-remove"
                aria-label="${langEn ? "Remove" : "Quitar"}"
                data-decant-v2-action="remove-decant"
                data-index="${index}">×</button>
            </span>
          </div>
        `;
      }).join("")}
    </div>

    <div class="builder-total decant-v2-total">
      <span>${escapeHtml(t("decants.total"))}</span>
      <strong>${money(total)}</strong>
    </div>

    ${state.decantContext === "gift"
      ? `
        <button class="btn u-mt-14" style="width:100%" type="button" data-decant-v2-action="finish-gift-decants">
          ${langEn ? "Add decants to gift" : "Agregar decants al regalo"}
        </button>
        <button class="btn secondary u-mt-8" style="width:100%" type="button" data-decant-v2-action="return-gift">
          ${langEn ? "Back without adding" : "Volver sin agregar"}
        </button>
      `
      : `
        <button class="btn u-mt-14" style="width:100%" type="button" data-action="add-decant-bundle-to-cart">
          ${escapeHtml(t("decants.cart"))}
        </button>
      `
    }
  `;
}

async function addDecantToDraft(productId)
{
  const template = getDefaultDecantTemplate();
  const max = Math.max(1, asNumber(template.max_productos, 5));
  const draft = alp41GetActiveDecantDraft();

  if (draft.length >= max)
  {
    toast(t("decants.limit"), "error");
    return;
  }

  const select = document.getElementById("decantSize-" + productId);
  const ml = asNumber(select?.value, 0);

  if (ml <= 0 || ml > 30)
  {
    return;
  }

  try
  {
    const price = await calculateDecantPrice(productId, ml);

    draft.push({
      type: "decant",
      productId: Number(productId),
      ml,
      price,
    });

    alp41PersistBuilderDrafts();
    updateDecantSummaryOnly();
  }
  catch (error)
  {
    toast(error.message, "error");
  }
}

function updateDecantSummaryOnly()
{
  alp41PersistBuilderDrafts();

  const host = document.getElementById("decantDraftSummary");
  if (host)
  {
    host.innerHTML = renderDecantDraftSummary();
  }

  const bubble = document.getElementById("decantFloatingBubble");
  if (bubble)
  {
    bubble.innerHTML = alp41RenderDecantBubble();
  }
}

function addDecantBundleToCart()
{
  if (state.decantContext === "gift")
  {
    alp41FinishGiftDecants();
    return;
  }

  const draft = alp41GetActiveDecantDraft();
  if (!draft.length)
  {
    return;
  }

  const items = draft.map(item => ({ ...item }));
  const total = items.reduce((sum, item) => sum + asNumber(item.price, 0), 0);
  const first = items[0] ? getProductById(items[0].productId) : null;

  state.cart.push({
    kind: "bundle",
    bundleType: "decant",
    key: makeId("decant"),
    title: t("decants.title"),
    qty: 1,
    unitPrice: total,
    items,
    image: first ? getProductMainImage(first) : "",
  });

  state.decantDraft = [];
  alp41PersistBuilderDrafts();
  saveLocalState();

  if (typeof analyticsV2TrackCartAdd === "function")
  {
    analyticsV2TrackCartAdd({ productId: null, kind: "decant_bundle" });
  }

  toast(
    state.language === "en"
      ? "Decant pack added to cart."
      : "Pack de decants agregado al carrito."
  );

  renderCurrentRoute();
  openCart();
}

function alp41StartGiftDecants()
{
  const option = getCurrentGiftOption();
  const max = Math.max(1, asNumber(option.max_productos, 4));

  if (alp41SafeArray(state.giftDraft).length >= max)
  {
    toast(
      state.language === "en"
        ? "This gift presentation is already full."
        : "Esta presentación ya alcanzó el máximo de productos.",
      "error"
    );
    return;
  }

  state.decantContext = "gift";
  state.giftDecantDraft = [];
  alp41PersistBuilderDrafts();
  setRoute("decants");
}

function alp41ReturnToGift()
{
  state.decantContext = "standalone";
  alp41PersistBuilderDrafts();
  setRoute("gifts");
}

function alp41FinishGiftDecants()
{
  const selected = alp41SafeArray(state.giftDecantDraft);
  if (!selected.length)
  {
    toast(
      state.language === "en" ? "Choose at least one decant." : "Elegí al menos un decant.",
      "error"
    );
    return;
  }

  const option = getCurrentGiftOption();
  const max = Math.max(1, asNumber(option.max_productos, 4));
  const current = alp41SafeArray(state.giftDraft);

  if (current.length + selected.length > max)
  {
    toast(
      state.language === "en"
        ? `This presentation allows up to ${max} items.`
        : `Esta presentación admite hasta ${max} productos en total.`,
      "error"
    );
    return;
  }

  state.giftDraft = [
    ...current,
    ...selected.map(item => ({
      type: "decant",
      productId: Number(item.productId),
      ml: Number(item.ml),
      price: asNumber(item.price, 0),
    })),
  ];

  state.giftDecantDraft = [];
  state.decantContext = "standalone";
  alp41PersistBuilderDrafts();

  toast(
    state.language === "en"
      ? "Decants added to the gift."
      : "Decants agregados al regalo."
  );

  setRoute("gifts");
}

function addGiftProductToDraft(productId)
{
  const option = getCurrentGiftOption();
  const max = Math.max(1, asNumber(option.max_productos, 4));

  if (alp41SafeArray(state.giftDraft).length >= max)
  {
    toast(t("gifts.limit"), "error");
    return;
  }

  const product = getProductById(productId);
  if (!product)
  {
    return;
  }

  state.giftDraft.push({
    type: "product",
    productId: product.id,
    price: product.precio,
  });

  alp41PersistBuilderDrafts();
  updateGiftSummaryOnly();
}

function renderGiftDraftSummary()
{
  const option = getCurrentGiftOption();
  const extra = asNumber(option.precio_adicional, 0);
  const draft = alp41SafeArray(state.giftDraft);
  const langEn = state.language === "en";
  const max = Math.max(1, asNumber(option.max_productos, 4));

  const productsTotal = draft.reduce((sum, item) => sum + asNumber(item.price, 0), 0);
  const total = productsTotal + extra;
  const decantCount = draft.filter(item => Number(item.ml) > 0 || item.type === "decant").length;

  return `
    <div class="gift-v2-builder-status">
      <span>${draft.length}/${max} ${langEn ? "items" : "productos"}</span>
      ${decantCount ? `<span>${decantCount} decant${decantCount === 1 ? "" : "s"}</span>` : ""}
    </div>

    ${draft.length
      ? draft.map((item, index) => {
          const product = getProductById(item.productId);
          const isDecant = Number(item.ml) > 0 || item.type === "decant";
          return `
            <div class="builder-summary-item gift-v2-summary-item">
              <span>
                <strong>${escapeHtml(product?.nombre || "Producto")}</strong>
                <small>${isDecant ? `${item.ml} ml · decant` : (langEn ? "Full bottle" : "Perfume")}</small>
              </span>
              <span>
                ${money(item.price)}
                <button type="button" class="decant-v2-remove" data-action="remove-gift-product" data-index="${index}" aria-label="${langEn ? "Remove" : "Quitar"}">×</button>
              </span>
            </div>
          `;
        }).join("")
      : `
        <div class="empty-state gift-v2-empty">
          <h3>${escapeHtml(t("gifts.empty"))}</h3>
          <p>${langEn ? "You can mix full bottles and decants." : "Podés mezclar perfumes completos y decants."}</p>
        </div>
      `
    }

    <button type="button" class="gift-v2-decant-cta" data-decant-v2-action="start-gift-decants">
      <span class="gift-v2-decant-icon">✦</span>
      <span>
        <strong>${langEn ? "Add decants to this gift" : "Agregar decants a este regalo"}</strong>
        <small>${langEn ? "Your gift selection will stay saved while you choose them." : "Tu regalo queda guardado mientras elegís las muestras."}</small>
      </span>
      <span>→</span>
    </button>

    ${extra > 0
      ? `
        <div class="builder-summary-item">
          <span>${langEn ? "Gift presentation" : "Presentación de regalo"}</span>
          <strong>${money(extra)}</strong>
        </div>
      `
      : ""
    }

    <div class="builder-total">
      <span>${escapeHtml(t("cart.total"))}</span>
      <strong>${money(total)}</strong>
    </div>

    <button class="btn u-mt-14" style="width:100%" type="button" data-action="add-gift-bundle-to-cart" ${draft.length ? "" : "disabled"}>
      ${escapeHtml(t("gifts.cart"))}
    </button>
  `;
}

function updateGiftSummaryOnly()
{
  alp41PersistBuilderDrafts();
  const host = document.getElementById("giftDraftSummary");
  if (host)
  {
    host.innerHTML = renderGiftDraftSummary();
  }
}

function addGiftBundleToCart()
{
  const draft = alp41SafeArray(state.giftDraft);
  if (!draft.length)
  {
    return;
  }

  const option = getCurrentGiftOption();
  const items = draft.map(item => ({ ...item }));
  const total = items.reduce((sum, item) => sum + asNumber(item.price, 0), 0)
    + asNumber(option.precio_adicional, 0);
  const first = items[0] ? getProductById(items[0].productId) : null;

  state.cart.push({
    kind: "bundle",
    bundleType: "gift",
    key: makeId("gift"),
    title: t("gifts.title"),
    optionSlug: option.slug,
    optionName: state.language === "en" ? option.nombre_en : option.nombre_es,
    qty: 1,
    unitPrice: total,
    items,
    image: first ? getProductMainImage(first) : "",
  });

  state.giftDraft = [];
  state.giftDecantDraft = [];
  state.decantContext = "standalone";
  alp41PersistBuilderDrafts();
  saveLocalState();

  toast(
    state.language === "en"
      ? "Gift added to cart."
      : "Regalo agregado al carrito."
  );

  renderCurrentRoute();
  openCart();
}

function alp41FilterDecantRows(query)
{
  const normalized = normalizeText(query || "");
  const rows = document.querySelectorAll("#decantV2ProductList .builder-product");

  rows.forEach(row => {
    const text = normalizeText(row.textContent || "");
    row.hidden = Boolean(normalized && !text.includes(normalized));
  });
}

if (!window.__alp41ListenersInstalled)
{
  window.__alp41ListenersInstalled = true;

  document.addEventListener("click", event => {
    const el = event.target.closest("[data-decant-v2-action]");
    if (!el)
    {
      return;
    }

    event.preventDefault();
    const action = el.dataset.decantV2Action;

    if (action === "remove-decant")
    {
      const draft = alp41GetActiveDecantDraft();
      const index = asNumber(el.dataset.index, -1);
      if (index >= 0 && index < draft.length)
      {
        draft.splice(index, 1);
        updateDecantSummaryOnly();
      }
      return;
    }

    if (action === "start-gift-decants")
    {
      alp41StartGiftDecants();
      return;
    }

    if (action === "finish-gift-decants")
    {
      alp41FinishGiftDecants();
      return;
    }

    if (action === "return-gift")
    {
      alp41ReturnToGift();
    }
  });

  document.addEventListener("input", event => {
    if (event.target?.id === "decantV2Search")
    {
      alp41FilterDecantRows(event.target.value);
    }
  });
}

alp41LoadBuilderDrafts();
