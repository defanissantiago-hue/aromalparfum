"use strict";

// =========================================================
// AromaLParfum — PASO 54
// Gift Sets + Discovery Boxes V2 — tienda pública
// Carga diferida: solo consulta Supabase al entrar a cada ruta.
// =========================================================

const alp54StorePacks = {
  giftSets: [],
  giftSetProducts: [],
  giftLoaded: false,
  giftLoading: false,
  giftError: "",
  discoveryBoxes: [],
  discoveryProducts: [],
  discoveryLoaded: false,
  discoveryLoading: false,
  discoveryError: "",
};

window.alp54StorePacks = alp54StorePacks;

function alp54Array(value) { return Array.isArray(value) ? value : []; }
function alp54Number(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function alp54Text(value) { return String(value ?? ""); }
function alp54Esc(value) { return escapeHtml(alp54Text(value)); }
function alp54Attr(value) { return escapeAttribute(alp54Text(value)); }
function alp54En() { return state.language === "en"; }

function alp54GiftComponents(giftSetId)
{
  return alp54StorePacks.giftSetProducts
    .filter(row => Number(row.gift_set_id) === Number(giftSetId))
    .sort((a, b) => alp54Number(a.orden) - alp54Number(b.orden) || Number(a.id) - Number(b.id));
}

function alp54DiscoveryComponents(boxId)
{
  return alp54StorePacks.discoveryProducts
    .filter(row => Number(row.discovery_box_id) === Number(boxId))
    .sort((a, b) => alp54Number(a.orden) - alp54Number(b.orden) || Number(a.id) - Number(b.id));
}

function alp54Product(productId)
{
  return getProductById(Number(productId)) || null;
}

function alp54GiftRegularValue(row)
{
  const components = alp54GiftComponents(row.id);
  if (!components.length) return 0;

  let total = 0;
  for (const component of components)
  {
    const product = alp54Product(component.product_id);
    if (!product || alp54Number(product.precio) <= 0) return 0;
    total += alp54Number(product.precio) * Math.max(1, alp54Number(component.cantidad, 1));
  }
  return total;
}

function alp54EstimateDecantPrice(productId, ml)
{
  const product = alp54Product(productId);
  const size = state.decantSizes.find(row => Number(row.ml) === Number(ml));
  const bottleMl = alp54Number(product?.ml);

  if (!product || bottleMl <= 0 || Number(ml) <= 0) return 0;

  const factor = alp54Number(size?.factor, 1);
  const container = alp54Number(size?.costo_envase, 0);
  const surcharge = Math.max(0, alp54Number(getSiteSetting("commerce", "decant_surcharge", 1000), 1000));
  const proportional = (alp54Number(product.precio) / bottleMl) * Number(ml) * factor + container;
  const rounded = Math.ceil(proportional / 100) * 100;
  return Math.max(0, rounded + surcharge);
}

function alp54DiscoveryRegularValue(row)
{
  const components = alp54DiscoveryComponents(row.id);
  if (!components.length) return 0;

  let total = 0;
  for (const component of components)
  {
    const price = alp54EstimateDecantPrice(component.product_id, component.ml);
    if (price <= 0) return 0;
    total += price * Math.max(1, alp54Number(component.cantidad, 1));
  }
  return total;
}

function alp54Savings(regular, promo)
{
  const r = Math.max(0, alp54Number(regular));
  const p = Math.max(0, alp54Number(promo));
  const amount = Math.max(0, r - p);
  const percent = r > 0 ? (amount / r) * 100 : 0;
  return { amount, percent };
}

function alp54GiftMaxSets(row)
{
  const components = alp54GiftComponents(row.id);
  if (!components.length) return 0;

  let max = Infinity;
  for (const component of components)
  {
    const product = alp54Product(component.product_id);
    const required = Math.max(1, alp54Number(component.cantidad, 1));
    if (!product) return 0;
    max = Math.min(max, Math.floor(Math.max(0, alp54Number(product.stock)) / required));
  }
  return Number.isFinite(max) ? Math.max(0, max) : 0;
}

function alp54PackImages(components, discovery = false)
{
  const products = components
    .map(component => ({ component, product: alp54Product(component.product_id) }))
    .filter(item => item.product)
    .slice(0, 4);

  if (!products.length)
  {
    return `<div class="pack54-empty-media"><span>✦</span></div>`;
  }

  return `
    <div class="pack54-collage count-${Math.min(products.length, 4)}">
      ${products.map(({ component, product }) => {
        const image = getProductMainImage(product);
        return `
          <div class="pack54-collage-item">
            ${image
              ? `<img src="${alp54Attr(image)}" alt="${alp54Attr(product.nombre)}" loading="lazy" decoding="async">`
              : `<span>✦</span>`}
            ${discovery ? `<small>${alp54Esc(component.ml)} ml</small>` : ""}
          </div>`;
      }).join("")}
    </div>`;
}

function alp54Contents(components, discovery = false)
{
  return `
    <ul class="pack54-contents">
      ${components.map(component => {
        const product = alp54Product(component.product_id);
        const qty = Math.max(1, alp54Number(component.cantidad, 1));
        const label = product?.nombre || `#${component.product_id}`;
        const detail = discovery
          ? `${component.ml} ml${qty > 1 ? ` × ${qty}` : ""}`
          : `${qty > 1 ? `×${qty}` : "1 unidad"}`;
        return `<li><span>${alp54Esc(label)}</span><strong>${alp54Esc(detail)}</strong></li>`;
      }).join("")}
    </ul>`;
}

function alp54LoadingPage(kind)
{
  const isGift = kind === "gift";
  return `
    <section class="section pack54-page">
      <div class="container">
        <div class="pack54-hero">
          <div><p class="eyebrow">${isGift ? "GIFT SETS" : "DISCOVERY BOXES"}</p><h1>${isGift ? (alp54En() ? "Gift Sets" : "Sets de regalo") : "Discovery Boxes"}</h1></div>
        </div>
        <div class="loading-state"><div class="spinner"></div><p>${alp54En() ? "Loading curated packs…" : "Cargando packs seleccionados…"}</p></div>
      </div>
    </section>`;
}

function alp54ErrorPage(kind, message)
{
  const isGift = kind === "gift";
  return `
    <section class="section pack54-page"><div class="container">
      <div class="pack54-hero"><div><p class="eyebrow">${isGift ? "GIFT SETS" : "DISCOVERY BOXES"}</p><h1>${isGift ? (alp54En() ? "Gift Sets" : "Sets de regalo") : "Discovery Boxes"}</h1></div></div>
      <div class="empty-state"><h3>${alp54En() ? "We couldn't load the packs." : "No pudimos cargar los packs."}</h3><p>${alp54Esc(message || "")}</p><button class="btn" type="button" data-alp54-action="retry" data-kind="${isGift ? "gift" : "discovery"}">${alp54En() ? "Retry" : "Reintentar"}</button></div>
    </div></section>`;
}

function alp54GiftCard(row)
{
  const components = alp54GiftComponents(row.id);
  const promo = Math.max(0, alp54Number(row.precio_promocional));
  const regular = alp54GiftRegularValue(row);
  const savings = alp54Savings(regular, promo);
  const maxSets = alp54GiftMaxSets(row);
  const soldOut = maxSets <= 0;
  const badge = row.badge_text || row.nivel || (alp54En() ? "Gift Set" : "Set de regalo");

  return `
    <article class="pack54-card ${row.destacado ? "featured" : ""}">
      <div class="pack54-media">
        ${alp54PackImages(components, false)}
        <div class="pack54-badges">
          <span>${alp54Esc(badge)}</span>
          ${row.destacado ? `<span class="accent">${alp54En() ? "Featured" : "Destacado"}</span>` : ""}
        </div>
      </div>
      <div class="pack54-body">
        <div class="pack54-title-row"><div><small>${alp54Esc(row.nivel || "AromaLParfum")}</small><h2>${alp54Esc(row.nombre)}</h2></div><strong class="pack54-price">${money(promo)}</strong></div>
        ${row.descripcion ? `<p class="pack54-description">${alp54Esc(row.descripcion)}</p>` : ""}
        ${regular > 0 ? `<div class="pack54-savings"><div><span>${alp54En() ? "Regular value" : "Valor por separado"}</span><s>${money(regular)}</s></div>${savings.amount > 0 ? `<strong>${alp54En() ? "You save" : "Ahorrás"} ${money(savings.amount)} · ${Math.round(savings.percent)}%</strong>` : `<strong>${alp54En() ? "Curated set" : "Selección especial"}</strong>`}</div>` : ""}
        <div class="pack54-content-block"><strong>${alp54En() ? "What's included" : "Qué incluye"}</strong>${alp54Contents(components, false)}</div>
        <div class="pack54-actions">
          <button class="btn" type="button" data-alp54-action="add-gift-set" data-id="${alp54Attr(row.id)}" ${soldOut ? "disabled" : ""}>${soldOut ? (alp54En() ? "Unavailable" : "Sin stock") : (alp54En() ? "Add set to cart" : "Agregar set al carrito")}</button>
          <button class="btn outline" type="button" data-route="gifts">${alp54En() ? "Build a custom gift" : "Armar regalo personalizado"}</button>
        </div>
      </div>
    </article>`;
}

function alp54DiscoveryCard(row)
{
  const components = alp54DiscoveryComponents(row.id);
  const promo = Math.max(0, alp54Number(row.precio_promocional));
  const regular = alp54DiscoveryRegularValue(row);
  const savings = alp54Savings(regular, promo);
  const totalDecants = components.reduce((sum, component) => sum + Math.max(1, alp54Number(component.cantidad, 1)), 0);

  return `
    <article class="pack54-card discovery">
      <div class="pack54-media">
        ${alp54PackImages(components, true)}
        <div class="pack54-badges"><span>DISCOVERY BOX</span><span class="accent">${totalDecants} ${totalDecants === 1 ? "decant" : "decants"}</span></div>
      </div>
      <div class="pack54-body">
        <div class="pack54-title-row"><div><small>${alp54En() ? "Try before choosing" : "Probá antes de elegir"}</small><h2>${alp54Esc(row.nombre)}</h2></div><strong class="pack54-price">${money(promo)}</strong></div>
        ${row.descripcion ? `<p class="pack54-description">${alp54Esc(row.descripcion)}</p>` : ""}
        ${regular > 0 ? `<div class="pack54-savings"><div><span>${alp54En() ? "Approx. separate value" : "Valor aprox. por separado"}</span><s>${money(regular)}</s></div>${savings.amount > 0 ? `<strong>${alp54En() ? "You save" : "Ahorrás"} ${money(savings.amount)} · ${Math.round(savings.percent)}%</strong>` : `<strong>${alp54En() ? "Curated discovery" : "Selección discovery"}</strong>`}</div>` : ""}
        <div class="pack54-content-block"><strong>${alp54En() ? "Inside the box" : "Dentro de la box"}</strong>${alp54Contents(components, true)}</div>
        <div class="pack54-actions">
          <button class="btn" type="button" data-alp54-action="add-discovery" data-id="${alp54Attr(row.id)}">${alp54En() ? "Add box to cart" : "Agregar box al carrito"}</button>
          <button class="btn outline" type="button" data-route="decants">${alp54En() ? "Build my own decant pack" : "Armar mi propio pack"}</button>
        </div>
      </div>
    </article>`;
}

function alp54RenderGiftSetsPage()
{
  if (!alp54StorePacks.giftLoaded)
  {
    if (!alp54StorePacks.giftLoading) setTimeout(() => alp54LoadGiftSets(), 0);
    if (alp54StorePacks.giftError) return alp54ErrorPage("gift", alp54StorePacks.giftError);
    return alp54LoadingPage("gift");
  }

  const rows = alp54StorePacks.giftSets;
  return `
    <section class="section pack54-page">
      <div class="container">
        ${renderPageCoverBanner("gift_sets", alp54En() ? "Gift Sets" : "Sets de regalo", alp54En() ? "Gift Sets" : "Sets de regalo")}
        <header class="pack54-hero">
          <div><p class="eyebrow">GIFT SETS</p><h1>${alp54En() ? "Ready-to-gift selections" : "Selecciones listas para regalar"}</h1><p>${alp54En() ? "Curated fragrance sets with a promotional price and a clear view of everything included." : "Packs de fragancias seleccionados, con precio promocional y todo su contenido a la vista."}</p></div>
          <button class="btn outline" type="button" data-route="gifts">${alp54En() ? "Build a custom gift" : "Armar un regalo a medida"}</button>
        </header>
        ${rows.length ? `<div class="pack54-grid">${rows.map(alp54GiftCard).join("")}</div>` : `<div class="empty-state"><h3>${alp54En() ? "No Gift Sets are published yet." : "Todavía no hay Gift Sets publicados."}</h3><p>${alp54En() ? "You can still create a custom gift." : "Mientras tanto podés armar un regalo personalizado."}</p><button class="btn" type="button" data-route="gifts">${alp54En() ? "Build gift" : "Armar regalo"}</button></div>`}
      </div>
    </section>`;
}

function alp54RenderDiscoveryPage()
{
  if (!alp54StorePacks.discoveryLoaded)
  {
    if (!alp54StorePacks.discoveryLoading) setTimeout(() => alp54LoadDiscovery(), 0);
    if (alp54StorePacks.discoveryError) return alp54ErrorPage("discovery", alp54StorePacks.discoveryError);
    return alp54LoadingPage("discovery");
  }

  const rows = alp54StorePacks.discoveryBoxes;
  return `
    <section class="section pack54-page">
      <div class="container">
        ${renderPageCoverBanner("discovery", "Discovery Boxes", "Discovery Boxes", alp54En() ? "Try several fragrances before choosing a full bottle." : "Probá varias fragancias antes de elegir una botella completa.")}
        <header class="pack54-hero">
          <div><p class="eyebrow">DISCOVERY BOXES</p><h1>${alp54En() ? "Discover more with every box" : "Descubrí más en cada box"}</h1><p>${alp54En() ? "Curated decant boxes to compare styles, notes and occasions without buying every full bottle." : "Cajas de decants seleccionadas para comparar estilos, notas y ocasiones sin comprar cada botella completa."}</p></div>
          <button class="btn outline" type="button" data-route="decants">${alp54En() ? "Build my own pack" : "Armar mi propio pack"}</button>
        </header>
        ${rows.length ? `<div class="pack54-grid">${rows.map(alp54DiscoveryCard).join("")}</div>` : `<div class="empty-state"><h3>${alp54En() ? "No Discovery Boxes are published yet." : "Todavía no hay Discovery Boxes publicadas."}</h3><p>${alp54En() ? "Build your own decant selection while new boxes are prepared." : "Podés armar tu propio pack de decants mientras preparamos nuevas boxes."}</p><button class="btn" type="button" data-route="decants">${alp54En() ? "Choose decants" : "Elegir decants"}</button></div>`}
      </div>
    </section>`;
}

async function alp54LoadGiftSets({ force = false } = {})
{
  if (alp54StorePacks.giftLoading) return;
  if (alp54StorePacks.giftLoaded && !force) return;

  alp54StorePacks.giftLoading = true;
  alp54StorePacks.giftError = "";

  try
  {
    const [sets, components] = await Promise.all([
      supabaseClient
        .from("gift_sets")
        .select("id,slug,nombre,descripcion,precio_promocional,nivel,orden,activo,destacado,badge_text")
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("id", { ascending: false }),
      supabaseClient
        .from("gift_set_products")
        .select("id,gift_set_id,product_id,cantidad,orden")
        .order("orden", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (sets.error) throw sets.error;
    if (components.error) throw components.error;

    alp54StorePacks.giftSets = alp54Array(sets.data);
    alp54StorePacks.giftSetProducts = alp54Array(components.data);
    alp54StorePacks.giftLoaded = true;
  }
  catch (error)
  {
    console.error("PASO54 Gift Sets:", error);
    alp54StorePacks.giftError = error?.message || String(error);
  }
  finally
  {
    alp54StorePacks.giftLoading = false;
    if (state.route === "gift-sets") renderCurrentRoute();
  }
}

async function alp54LoadDiscovery({ force = false } = {})
{
  if (alp54StorePacks.discoveryLoading) return;
  if (alp54StorePacks.discoveryLoaded && !force) return;

  alp54StorePacks.discoveryLoading = true;
  alp54StorePacks.discoveryError = "";

  try
  {
    const [boxes, components] = await Promise.all([
      supabaseClient
        .from("discovery_boxes")
        .select("id,slug,nombre,descripcion,precio_promocional,orden,activo")
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("id", { ascending: false }),
      supabaseClient
        .from("discovery_box_products")
        .select("id,discovery_box_id,product_id,ml,cantidad,orden")
        .order("orden", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (boxes.error) throw boxes.error;
    if (components.error) throw components.error;

    alp54StorePacks.discoveryBoxes = alp54Array(boxes.data);
    alp54StorePacks.discoveryProducts = alp54Array(components.data);
    alp54StorePacks.discoveryLoaded = true;
  }
  catch (error)
  {
    console.error("PASO54 Discovery Boxes:", error);
    alp54StorePacks.discoveryError = error?.message || String(error);
  }
  finally
  {
    alp54StorePacks.discoveryLoading = false;
    if (state.route === "discovery") renderCurrentRoute();
  }
}

function alp54AddOrIncrement(line)
{
  const existing = state.cart.find(item => item.key === line.key);
  if (existing)
  {
    existing.qty = Math.min(10, Math.max(1, alp54Number(existing.qty, 1)) + 1);
  }
  else
  {
    state.cart.push(line);
  }
  saveLocalState();
  renderCart();
  openCart();
}

function alp54AddGiftSet(id)
{
  const row = alp54StorePacks.giftSets.find(item => Number(item.id) === Number(id));
  if (!row) return;

  const components = alp54GiftComponents(row.id);
  const maxSets = alp54GiftMaxSets(row);
  if (maxSets <= 0)
  {
    toast(alp54En() ? "This Gift Set is currently unavailable." : "Este Gift Set no tiene stock suficiente.", "error");
    return;
  }

  const regular = alp54GiftRegularValue(row);
  const promo = Math.max(0, alp54Number(row.precio_promocional));
  const savings = alp54Savings(regular, promo);
  const firstProduct = components.map(component => alp54Product(component.product_id)).find(Boolean);

  alp54AddOrIncrement({
    kind: "bundle",
    bundleType: "gift_set",
    key: `gift_set:${row.id}`,
    giftSetId: Number(row.id),
    qty: 1,
    title: row.nombre,
    unitPrice: promo,
    image: firstProduct ? getProductMainImage(firstProduct) : "",
    regularValue: regular,
    savings: savings.amount,
    items: components.map(component => ({
      productId: Number(component.product_id),
      qty: Math.max(1, alp54Number(component.cantidad, 1)),
    })),
  });

  toast(alp54En() ? `${row.nombre} added to cart.` : `${row.nombre} agregado al carrito.`);
}

function alp54AddDiscovery(id)
{
  const row = alp54StorePacks.discoveryBoxes.find(item => Number(item.id) === Number(id));
  if (!row) return;

  const components = alp54DiscoveryComponents(row.id);
  if (!components.length)
  {
    toast(alp54En() ? "This Discovery Box has no decants." : "Esta Discovery Box no tiene decants configurados.", "error");
    return;
  }

  const regular = alp54DiscoveryRegularValue(row);
  const promo = Math.max(0, alp54Number(row.precio_promocional));
  const savings = alp54Savings(regular, promo);
  const firstProduct = components.map(component => alp54Product(component.product_id)).find(Boolean);

  alp54AddOrIncrement({
    kind: "bundle",
    bundleType: "discovery_box",
    key: `discovery_box:${row.id}`,
    discoveryBoxId: Number(row.id),
    qty: 1,
    title: row.nombre,
    unitPrice: promo,
    image: firstProduct ? getProductMainImage(firstProduct) : "",
    regularValue: regular,
    savings: savings.amount,
    items: components.map(component => ({
      productId: Number(component.product_id),
      ml: Number(component.ml),
      qty: Math.max(1, alp54Number(component.cantidad, 1)),
    })),
  });

  toast(alp54En() ? `${row.nombre} added to cart.` : `${row.nombre} agregada al carrito.`);
}

// Sobrescribimos únicamente las dos páginas legacy. Si el módulo no carga,
// store.js conserva sus páginas anteriores como fallback.
if (typeof renderGiftSetsPage === "function")
{
  renderGiftSetsPage = alp54RenderGiftSetsPage;
}

if (typeof renderDiscoveryPage === "function")
{
  renderDiscoveryPage = alp54RenderDiscoveryPage;
}

// Metadatos más útiles en el carrito para los packs del Paso 54.
if (typeof getCartLineMeta === "function")
{
  const ALP54_BASE_CART_META = getCartLineMeta;
  getCartLineMeta = function alp54CartLineMeta(line)
  {
    if (line?.bundleType === "gift_set")
    {
      const count = alp54Array(line.items).reduce((sum, item) => sum + Math.max(1, alp54Number(item.qty, 1)), 0);
      return alp54En() ? `${count} fragrance item(s) · Gift Set` : `${count} perfume(s) · Gift Set`;
    }
    if (line?.bundleType === "discovery_box")
    {
      const count = alp54Array(line.items).reduce((sum, item) => sum + Math.max(1, alp54Number(item.qty, 1)), 0);
      return `${count} decant(s) · Discovery Box`;
    }
    return ALP54_BASE_CART_META(line);
  };
}

if (!window.__alp54PublicPacksEvents)
{
  window.__alp54PublicPacksEvents = true;
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-alp54-action]");
    if (!target) return;

    event.preventDefault();
    const action = target.dataset.alp54Action;

    if (action === "add-gift-set")
    {
      alp54AddGiftSet(target.dataset.id);
      return;
    }
    if (action === "add-discovery")
    {
      alp54AddDiscovery(target.dataset.id);
      return;
    }
    if (action === "retry")
    {
      if (target.dataset.kind === "gift")
      {
        alp54StorePacks.giftError = "";
        alp54LoadGiftSets({ force: true });
      }
      else
      {
        alp54StorePacks.discoveryError = "";
        alp54LoadDiscovery({ force: true });
      }
    }
  });
}
