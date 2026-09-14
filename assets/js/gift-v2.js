"use strict";

// AromaLParfum Frontend V2 — Paso 42
// Gift Builder V2: presentación + perfumes + decants + extras + tarjeta
// + total en vivo + payload listo para Checkout Seguro V2.

const ALP42_GIFT_STORAGE_KEY =
  typeof ALP41_GIFT_DRAFT_KEY !== "undefined"
  ? ALP41_GIFT_DRAFT_KEY
  : "alp_gift_builder_v1";

const ALP42_BASE_CART_META = typeof getCartLineMeta === "function" ? getCartLineMeta : null;
const ALP42_BASE_CART_TEXT = typeof buildCartLineText === "function" ? buildCartLineText : null;
const ALP42_BASE_CART_RENDER_LINE = typeof renderCartLine === "function" ? renderCartLine : null;
const ALP42_BASE_CHANGE_CART_QTY = typeof changeCartQuantity === "function" ? changeCartQuantity : null;

function alp42Arr(value)
{
  return Array.isArray(value) ? value : [];
}

function alp42PersistGiftState()
{
  if (typeof ALP41_STANDALONE_DRAFT_KEY !== "undefined")
  {
    localStorage.setItem(ALP41_STANDALONE_DRAFT_KEY, JSON.stringify(alp42Arr(state.decantDraft)));
  }

  localStorage.setItem(
    ALP42_GIFT_STORAGE_KEY,
    JSON.stringify({
      giftDraft: alp42Arr(state.giftDraft),
      giftDecantDraft: alp42Arr(state.giftDecantDraft),
      selectedGiftOption: state.selectedGiftOption || null,
      selectedGiftAddons: alp42Arr(state.selectedGiftAddons),
      giftCardMessage: String(state.giftCardMessage || ""),
      decantContext: state.decantContext === "gift" ? "gift" : "standalone",
    })
  );
}

if (typeof alp41PersistBuilderDrafts === "function")
{
  alp41PersistBuilderDrafts = alp42PersistGiftState;
}

function alp42LoadGiftState()
{
  const saved = safeJsonParse(localStorage.getItem(ALP42_GIFT_STORAGE_KEY), {}) || {};
  state.selectedGiftAddons = alp42Arr(saved.selectedGiftAddons).map(String);
  state.giftCardMessage = String(saved.giftCardMessage || "");

  if (saved.selectedGiftOption)
  {
    state.selectedGiftOption = saved.selectedGiftOption;
  }
}

function alp42Settings()
{
  const value = state.giftBuilderSettings && typeof state.giftBuilderSettings === "object"
    ? state.giftBuilderSettings
    : {};

  return {
    enabled: value.enabled !== false,
    allowProducts: value.allow_products !== false,
    allowDecants: value.allow_decants !== false,
    cardMax: Math.max(20, asNumber(value.card_message_max_length, 240)),
    defaultMax: Math.max(1, asNumber(value.default_max_items, 8)),
  };
}

function alp42Addons()
{
  return alp42Arr(state.giftAddons)
    .filter(item => item && item.slug && item.activo !== false)
    .sort((a,b) => asNumber(a.orden,0) - asNumber(b.orden,0));
}

function alp42SelectedAddons()
{
  const selected = new Set(alp42Arr(state.selectedGiftAddons).map(String));
  return alp42Addons().filter(item => selected.has(String(item.slug)));
}

function alp42CardSelected()
{
  return alp42SelectedAddons().some(item => item.addon_type === "card");
}

function alp42Totals()
{
  const option = getCurrentGiftOption();
  const items = alp42Arr(state.giftDraft).reduce((sum,item) => sum + asNumber(item.price,0), 0);
  const presentation = asNumber(option?.precio_adicional, 0);
  const addons = alp42SelectedAddons().reduce((sum,item) => sum + asNumber(item.precio_adicional,0), 0);

  return { items, presentation, addons, total: items + presentation + addons };
}

function alp42AddonLabel(type)
{
  const en = state.language === "en";
  return ({
    bag: en ? "Gift bag" : "Bolsa",
    wrap: en ? "Wrapping" : "Envoltorio",
    card: en ? "Card" : "Tarjeta",
  })[type] || "Extra";
}

function alp42AddonIcon(type)
{
  return ({ bag:"◇", wrap:"✦", card:"✉" })[type] || "+";
}

function alp42RenderPresentations()
{
  const en = state.language === "en";

  return `
    <div class="gift42-section-block">
      <div class="gift42-block-head">
        <div><span class="gift42-step">01</span><strong>${en ? "Choose the presentation" : "Elegí la presentación"}</strong></div>
        <small>${en ? "This defines how many items fit in the gift." : "Define cuántos productos admite el regalo."}</small>
      </div>

      <div class="gift42-presentation-grid">
        ${alp42Arr(state.giftOptions).map(option => {
          const selected = option.slug === state.selectedGiftOption;
          const name = en ? (option.nombre_en || option.nombre_es) : option.nombre_es;
          return `
            <button type="button" class="gift42-presentation-card ${selected ? "is-selected" : ""}"
              data-gift-v2-action="select-presentation" data-gift-option="${escapeAttribute(option.slug)}"
              aria-pressed="${selected ? "true" : "false"}">
              <span class="gift42-presentation-check">${selected ? "✓" : ""}</span>
              <strong>${escapeHtml(name || option.slug)}</strong>
              <small>${Math.max(1,asNumber(option.max_productos,4))} ${en ? "items max." : "productos máx."}</small>
              <b>${asNumber(option.precio_adicional,0) > 0 ? `+ ${money(option.precio_adicional)}` : (en ? "Included" : "Incluida")}</b>
            </button>`;
        }).join("")}
      </div>
    </div>`;
}

function alp42RenderCardMessage()
{
  const en = state.language === "en";
  const max = alp42Settings().cardMax;
  const value = String(state.giftCardMessage || "").slice(0,max);

  return `
    <div class="gift42-card-message">
      <div class="gift42-card-message-head">
        <label for="gift42CardMessage">${en ? "Message for the card" : "Mensaje para la tarjeta"}</label>
        <span id="gift42CardCount">${value.length}/${max}</span>
      </div>
      <textarea id="gift42CardMessage" maxlength="${max}"
        placeholder="${en ? "Write a short message..." : "Escribí un mensaje corto..."}">${escapeHtml(value)}</textarea>
      <small>${en ? "This message is saved with the gift." : "El mensaje queda guardado junto al regalo."}</small>
    </div>`;
}

function alp42RenderAddons()
{
  const addons = alp42Addons();
  if (!addons.length) return "";

  const en = state.language === "en";
  const selected = new Set(alp42Arr(state.selectedGiftAddons).map(String));

  return `
    <div class="gift42-section-block">
      <div class="gift42-block-head">
        <div><span class="gift42-step">03</span><strong>${en ? "Finish the gift" : "Terminá el regalo"}</strong></div>
        <small>${en ? "Add only what you want." : "Agregá solamente lo que quieras."}</small>
      </div>

      <div class="gift42-addon-grid">
        ${addons.map(addon => {
          const on = selected.has(String(addon.slug));
          const name = en ? (addon.nombre_en || addon.nombre_es) : addon.nombre_es;
          return `
            <button type="button" class="gift42-addon-card ${on ? "is-selected" : ""}"
              data-gift-v2-action="toggle-addon" data-addon-slug="${escapeAttribute(addon.slug)}"
              aria-pressed="${on ? "true" : "false"}">
              <span class="gift42-addon-icon">${alp42AddonIcon(addon.addon_type)}</span>
              <span class="gift42-addon-copy">
                <small>${escapeHtml(alp42AddonLabel(addon.addon_type))}</small>
                <strong>${escapeHtml(name || addon.slug)}</strong>
                ${addon.descripcion_es ? `<em>${escapeHtml(addon.descripcion_es)}</em>` : ""}
              </span>
              <span class="gift42-addon-price">${asNumber(addon.precio_adicional,0) > 0 ? `+ ${money(addon.precio_adicional)}` : (en ? "No extra cost" : "Sin costo extra")}</span>
              <span class="gift42-addon-check">${on ? "✓" : "+"}</span>
            </button>`;
        }).join("")}
      </div>
      ${alp42CardSelected() ? alp42RenderCardMessage() : ""}
    </div>`;
}

function alp42RenderProducts(products)
{
  const en = state.language === "en";

  return `
    <div class="gift42-section-block">
      <div class="gift42-block-head">
        <div><span class="gift42-step">02</span><strong>${en ? "Choose what goes inside" : "Elegí qué va adentro"}</strong></div>
        <small>${en ? "Mix full bottles and decants." : "Podés mezclar perfumes completos y decants."}</small>
      </div>

      <div class="gift42-product-toolbar">
        <input type="search" id="gift42ProductSearch" class="search-input" autocomplete="off"
          placeholder="${en ? "Search perfume..." : "Buscar perfume..."}">
        <button type="button" class="btn secondary" data-decant-v2-action="start-gift-decants">
          ✦ ${en ? "Add decants" : "Agregar decants"}
        </button>
      </div>

      <div class="builder-list gift42-product-list" id="gift42ProductList">
        ${products.map(product => renderGiftProductRow(product)).join("")}
      </div>
    </div>`;
}

function renderGiftBuilderPage()
{
  const settings = alp42Settings();
  const en = state.language === "en";

  if (!settings.enabled)
  {
    return `<section class="section"><div class="container"><div class="empty-state"><h2>${en ? "Gift Builder unavailable" : "Gift Builder no disponible"}</h2></div></div></section>`;
  }

  if (!state.selectedGiftOption && state.giftOptions.length)
  {
    state.selectedGiftOption = state.giftOptions[0].slug;
  }

  const products = settings.allowProducts ? getGiftEligibleProducts() : [];

  return `
    <section class="section gift42-page">
      <div class="container">
        <div class="gift42-hero">
          <div>
            <p class="eyebrow">${escapeHtml(t("gifts.eyebrow"))}</p>
            <h1 class="section-title">${en ? "Build a gift that feels personal." : "Armá un regalo que se sienta personal."}</h1>
            <p class="section-subtitle">${en
              ? "Choose the presentation, add fragrances or decants, then finish it with bag, wrapping and a personalized card."
              : "Elegí la presentación, sumá perfumes o decants y terminá con bolsa, envoltorio y una tarjeta personalizada."}</p>
          </div>
          <div class="gift42-hero-badge"><span>✦</span><div><strong>${en ? "Live total" : "Total en vivo"}</strong><small>${en ? "Supabase revalidates all prices before adding it." : "Supabase vuelve a validar todos los precios antes de agregarlo."}</small></div></div>
        </div>

        <div class="builder-layout gift42-layout">
          <div class="builder-panel gift42-main-panel">
            ${alp42RenderPresentations()}
            ${alp42RenderProducts(products)}
            ${alp42RenderAddons()}
          </div>
          <aside class="builder-panel sticky gift42-summary-panel">
            <p class="eyebrow">${escapeHtml(t("gifts.selection"))}</p>
            <div id="giftDraftSummary">${renderGiftDraftSummary()}</div>
          </aside>
        </div>
      </div>
    </section>`;
}

function renderGiftDraftSummary()
{
  const option = getCurrentGiftOption();
  const draft = alp42Arr(state.giftDraft);
  const addons = alp42SelectedAddons();
  const totals = alp42Totals();
  const en = state.language === "en";
  const max = Math.max(1, asNumber(option?.max_productos, alp42Settings().defaultMax));
  const decants = draft.filter(item => Number(item.ml) > 0 || item.type === "decant").length;
  const optionName = en ? (option?.nombre_en || option?.nombre_es || "") : (option?.nombre_es || "");

  return `
    <div class="gift-v2-builder-status">
      <span>${draft.length}/${max} ${en ? "items" : "productos"}</span>
      ${decants ? `<span>${decants} decant${decants === 1 ? "" : "s"}</span>` : ""}
      ${addons.length ? `<span>${addons.length} extras</span>` : ""}
    </div>

    <div class="gift42-summary-presentation"><small>${en ? "Presentation" : "Presentación"}</small><strong>${escapeHtml(optionName)}</strong><span>${totals.presentation > 0 ? money(totals.presentation) : (en ? "Included" : "Incluida")}</span></div>

    ${draft.length ? draft.map((item,index) => {
      const product = getProductById(item.productId);
      const decant = Number(item.ml) > 0 || item.type === "decant";
      return `<div class="builder-summary-item gift42-summary-item"><span><strong>${escapeHtml(product?.nombre || "Producto")}</strong><small>${decant ? `${item.ml} ml · decant` : (en ? "Full bottle" : "Perfume")}</small></span><span>${money(item.price)} <button type="button" class="decant-v2-remove" data-action="remove-gift-product" data-index="${index}">×</button></span></div>`;
    }).join("") : `<div class="empty-state gift-v2-empty"><h3>${escapeHtml(t("gifts.empty"))}</h3><p>${en ? "Start with a perfume or add decants." : "Empezá con un perfume o agregá decants."}</p></div>`}

    ${addons.length ? `<div class="gift42-summary-divider"></div>${addons.map(addon => `<div class="builder-summary-item gift42-addon-summary"><span>${escapeHtml(en ? (addon.nombre_en || addon.nombre_es) : addon.nombre_es)}</span><strong>${asNumber(addon.precio_adicional,0) > 0 ? money(addon.precio_adicional) : "—"}</strong></div>`).join("")}` : ""}

    ${alp42CardSelected() && String(state.giftCardMessage || "").trim() ? `<div class="gift42-message-preview"><span>✉</span><p>${escapeHtml(String(state.giftCardMessage).trim())}</p></div>` : ""}

    <div class="gift42-price-breakdown">
      <div><span>${en ? "Products" : "Productos"}</span><strong>${money(totals.items)}</strong></div>
      <div><span>${en ? "Presentation" : "Presentación"}</span><strong>${money(totals.presentation)}</strong></div>
      <div><span>${en ? "Extras" : "Extras"}</span><strong>${money(totals.addons)}</strong></div>
    </div>

    <div class="builder-total gift42-grand-total"><span>${escapeHtml(t("cart.total"))}</span><strong>${money(totals.total)}</strong></div>

    <button class="btn u-mt-14" style="width:100%" type="button" data-action="add-gift-bundle-to-cart" ${draft.length ? "" : "disabled"}>
      ${state.giftBuilderAdding ? (en ? "Validating..." : "Validando...") : escapeHtml(t("gifts.cart"))}
    </button>
    <small class="gift42-secure-note">${en ? "Supabase validates every perfume, decant, presentation and extra before adding the gift." : "Supabase valida cada perfume, decant, presentación y extra antes de agregar el regalo."}</small>`;
}

function updateGiftSummaryOnly()
{
  alp42PersistGiftState();
  const host = document.getElementById("giftDraftSummary");
  if (host) host.innerHTML = renderGiftDraftSummary();
}

function alp42SelectPresentation(slug)
{
  const option = alp42Arr(state.giftOptions).find(item => item.slug === slug);
  if (!option) return;

  const current = alp42Arr(state.giftDraft).length;
  const max = Math.max(1, asNumber(option.max_productos,4));

  if (current > max)
  {
    toast(state.language === "en"
      ? `This presentation allows up to ${max} items. Remove ${current-max} first.`
      : `Esta presentación admite hasta ${max} productos. Quitá ${current-max} antes de cambiar.`, "error");
    return;
  }

  state.selectedGiftOption = option.slug;
  alp42PersistGiftState();
  renderCurrentRoute();
}

function alp42ToggleAddon(slug)
{
  const addon = alp42Addons().find(item => item.slug === slug);
  if (!addon) return;

  const selected = new Set(alp42Arr(state.selectedGiftAddons).map(String));
  if (selected.has(String(slug)))
  {
    selected.delete(String(slug));
    if (addon.addon_type === "card") state.giftCardMessage = "";
  }
  else
  {
    selected.add(String(slug));
  }

  state.selectedGiftAddons = Array.from(selected);
  alp42PersistGiftState();
  renderCurrentRoute();
}

function alp42FilterGiftProducts(query)
{
  const q = normalizeText(query || "");
  document.querySelectorAll("#gift42ProductList .builder-product").forEach(row => {
    row.hidden = Boolean(q && !normalizeText(row.textContent || "").includes(q));
  });
}

function alp42GiftPreviewItems()
{
  return alp42Arr(state.giftDraft).map(item => ({
    type: item.type === "decant" || Number(item.ml) > 0 ? "decant" : "product",
    productId: Number(item.productId),
    qty: Math.max(1, asNumber(item.qty,1)),
    ...(Number(item.ml) > 0 ? { ml:Number(item.ml) } : {}),
  }));
}

async function alp42PreviewGiftServer()
{
  const items = alp42GiftPreviewItems();
  if (!items.length) throw new Error(state.language === "en" ? "Add at least one product." : "Agregá al menos un producto.");

  const result = await supabaseClient.rpc("preview_gift_builder", {
    p_items: items,
    p_presentation_slug: state.selectedGiftOption || null,
    p_addon_slugs: alp42SelectedAddons().map(addon => addon.slug),
    p_card_message: alp42CardSelected() ? (String(state.giftCardMessage || "").trim() || null) : null,
  });

  if (result.error) throw new Error(result.error.message || "No se pudo validar el regalo.");
  return result.data || {};
}

async function addGiftBundleToCart()
{
  if (state.giftBuilderAdding) return;
  const draft = alp42Arr(state.giftDraft);
  if (!draft.length) return;

  state.giftBuilderAdding = true;
  updateGiftSummaryOnly();

  try
  {
    const option = getCurrentGiftOption();
    const preview = await alp42PreviewGiftServer();
    const addons = alp42SelectedAddons();
    const items = alp42GiftPreviewItems();
    const first = items[0] ? getProductById(items[0].productId) : null;
    const card = alp42CardSelected() ? String(state.giftCardMessage || "").trim() : "";
    const serverTotal = asNumber(preview.total, alp42Totals().total);

    state.cart.push({
      kind:"bundle",
      bundleType:"gift_builder",
      key:makeId("gift-builder"),
      title: state.language === "en" ? "Personalized gift" : "Regalo personalizado",
      presentationSlug:option.slug,
      presentationName: state.language === "en" ? (option.nombre_en || option.nombre_es) : option.nombre_es,
      addonSlugs:addons.map(addon => addon.slug),
      addons:addons.map(addon => ({ slug:addon.slug, type:addon.addon_type, name:state.language === "en" ? (addon.nombre_en || addon.nombre_es) : addon.nombre_es, price:asNumber(addon.precio_adicional,0) })),
      cardMessage:card,
      qty:1,
      unitPrice:serverTotal,
      items:items.map(item => ({ ...item, price:asNumber(draft.find(source => Number(source.productId) === Number(item.productId) && Number(source.ml||0) === Number(item.ml||0))?.price,0) })),
      checkoutV2:{ type:"gift_builder", qty:1, presentationSlug:option.slug, addonSlugs:addons.map(addon => addon.slug), cardMessage:card || null, items },
      image:first ? getProductMainImage(first) : "",
    });

    state.giftDraft = [];
    state.giftDecantDraft = [];
    state.selectedGiftAddons = [];
    state.giftCardMessage = "";
    state.decantContext = "standalone";
    alp42PersistGiftState();
    saveLocalState();

    toast(state.language === "en" ? "Personalized gift added to cart." : "Regalo personalizado agregado al carrito.");
    renderCurrentRoute();
    openCart();
  }
  catch (error)
  {
    toast(error.message || "No se pudo agregar el regalo.", "error");
  }
  finally
  {
    state.giftBuilderAdding = false;
    if (document.getElementById("giftDraftSummary")) updateGiftSummaryOnly();
  }
}

if (ALP42_BASE_CART_META)
{
  getCartLineMeta = function(line)
  {
    if (line?.bundleType === "gift_builder")
    {
      const parts = [];
      if (line.presentationName) parts.push(line.presentationName);
      if (Array.isArray(line.items)) parts.push(`${line.items.length} ${state.language === "en" ? "items" : "productos"}`);
      if (Array.isArray(line.addons) && line.addons.length) parts.push(`${line.addons.length} extras`);
      return parts.join(" · ");
    }
    return ALP42_BASE_CART_META(line);
  };
}

if (ALP42_BASE_CART_TEXT)
{
  buildCartLineText = function(line)
  {
    const base = ALP42_BASE_CART_TEXT(line);
    if (line?.bundleType !== "gift_builder") return base;

    const extra = [];
    if (line.presentationName) extra.push(`   - ${state.language === "en" ? "Presentation" : "Presentación"}: ${line.presentationName}`);
    alp42Arr(line.addons).forEach(addon => extra.push(`   - ${addon.name || addon.slug}${asNumber(addon.price,0) > 0 ? ` (${money(addon.price)})` : ""}`));
    if (line.cardMessage) extra.push(`   - ${state.language === "en" ? "Card" : "Tarjeta"}: ${line.cardMessage}`);
    return [base, ...extra].join("\n");
  };
}

if (ALP42_BASE_CHANGE_CART_QTY)
{
  changeCartQuantity = function(key, delta)
  {
    const line = state.cart.find(item => item.key === key);
    if (line?.bundleType === "gift_builder" && asNumber(delta,0) > 0)
    {
      toast(state.language === "en" ? "Personalized gifts are added one at a time." : "Los regalos personalizados se agregan de a uno.", "error");
      return;
    }
    return ALP42_BASE_CHANGE_CART_QTY(key, delta);
  };
}

if (ALP42_BASE_CART_RENDER_LINE)
{
  renderCartLine = function(line)
  {
    if (line?.bundleType !== "gift_builder") return ALP42_BASE_CART_RENDER_LINE(line);

    const image = getCartLineImage(line);
    const title = getCartLineTitle(line);
    const meta = getCartLineMeta(line);
    const addonNames = alp42Arr(line.addons).map(addon => addon.name || addon.slug).filter(Boolean).join(" · ");

    return `<article class="cart-line gift42-cart-line">
      <div class="cart-line-image">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(title)}">` : `<span>✦</span>`}</div>
      <div><h4>${escapeHtml(title)}</h4><div class="cart-line-meta">${escapeHtml(meta)}</div>${addonNames ? `<div class="cart-line-meta">${escapeHtml(addonNames)}</div>` : ""}${line.cardMessage ? `<div class="gift42-cart-message">“${escapeHtml(line.cardMessage)}”</div>` : ""}<button class="text-link" type="button" data-action="remove-cart-line" data-cart-key="${escapeAttribute(line.key)}">${escapeHtml(t("cart.remove"))}</button></div>
      <strong>${money(getCartLineUnitPrice(line))}</strong>
    </article>`;
  };
}

// Serializador listo para create_store_order_v2(). No envía precios.
function getCheckoutV2CartItems()
{
  const payload = [];

  state.cart.forEach(line => {
    const lineQty = Math.max(1, asNumber(line.qty,1));

    if (line.kind === "product")
    {
      payload.push({ type:"product", productId:Number(line.productId ?? line.id), qty:lineQty });
      return;
    }

    if (line.bundleType === "decant")
    {
      alp42Arr(line.items).forEach(item => payload.push({ type:"decant", productId:Number(item.productId), ml:Number(item.ml), qty:lineQty * Math.max(1,asNumber(item.qty,1)) }));
      return;
    }

    if (line.bundleType === "gift_builder")
    {
      payload.push(line.checkoutV2 || {
        type:"gift_builder",
        qty:1,
        presentationSlug:line.presentationSlug,
        addonSlugs:alp42Arr(line.addonSlugs),
        cardMessage:line.cardMessage || null,
        items:alp42Arr(line.items).map(item => ({ type:item.type === "decant" || Number(item.ml) > 0 ? "decant" : "product", productId:Number(item.productId), qty:Math.max(1,asNumber(item.qty,1)), ...(Number(item.ml)>0 ? { ml:Number(item.ml) } : {}) })),
      });
      return;
    }

    // Compatibilidad con regalos guardados antes del Paso 42.
    if (line.bundleType === "gift")
    {
      payload.push({ type:"gift_builder", qty:1, presentationSlug:line.optionSlug, addonSlugs:[], cardMessage:null, items:alp42Arr(line.items).map(item => ({ type:Number(item.ml)>0 ? "decant" : "product", productId:Number(item.productId), qty:1, ...(Number(item.ml)>0 ? {ml:Number(item.ml)} : {}) })) });
      return;
    }

    if (line.bundleType === "gift_set" && line.giftSetId)
    {
      payload.push({ type:"gift_set", giftSetId:Number(line.giftSetId), qty:lineQty });
      return;
    }

    if (line.bundleType === "discovery_box" && line.discoveryBoxId)
    {
      payload.push({ type:"discovery_box", discoveryBoxId:Number(line.discoveryBoxId), qty:lineQty });
    }
  });

  return payload;
}

if (!window.__alp42GiftListenersInstalled)
{
  window.__alp42GiftListenersInstalled = true;

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-gift-v2-action]");
    if (!target) return;
    event.preventDefault();

    if (target.dataset.giftV2Action === "select-presentation")
    {
      alp42SelectPresentation(target.dataset.giftOption || "");
      return;
    }

    if (target.dataset.giftV2Action === "toggle-addon")
    {
      alp42ToggleAddon(target.dataset.addonSlug || "");
    }
  });

  document.addEventListener("input", event => {
    if (event.target?.id === "gift42ProductSearch")
    {
      alp42FilterGiftProducts(event.target.value);
      return;
    }

    if (event.target?.id === "gift42CardMessage")
    {
      const max = alp42Settings().cardMax;
      state.giftCardMessage = String(event.target.value || "").slice(0,max);
      const counter = document.getElementById("gift42CardCount");
      if (counter) counter.textContent = `${state.giftCardMessage.length}/${max}`;
      alp42PersistGiftState();
      updateGiftSummaryOnly();
    }
  });
}

alp42LoadGiftState();
