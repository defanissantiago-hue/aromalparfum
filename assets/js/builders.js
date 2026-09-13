"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: decants y regalos

function getDefaultDecantTemplate()
{
  return state.comboTemplates.find(
    template =>
    normalizeText(
      template.tipo
    ) ===
    "decants"
  )
  ||
  {
    id:
    null,

    nombre:
    t(
      "decants.title"
    ),

    max_productos:
    5,
  };
}

function getDecantEligibleProducts()
{
  const template =
  getDefaultDecantTemplate();

  const mappings =
  state.comboProducts.filter(
    row =>
    Number(
      row.combo_id
    ) ===
    Number(
      template.id
    )
  );

  if (
    mappings.length
  )
  {
    const allowed =
    new Set(
      mappings.map(
        row =>
        Number(
          row.product_id
        )
      )
    );

    return state.products.filter(
      product =>
      allowed.has(
        Number(
          product.id
        )
      )
      &&
      product.stock > 0
    );
  }

  return state.products.filter(
    product =>
    product.stock > 0
    &&
    (
      product.tipo_producto_slug === "perfume"
      ||
      normalizeText(
        product.tipo_producto
      ) ===
      "perfume"
    )
  );
}

function getDecantSizeRowsForProduct(
  productId
)
{
  const template =
  getDefaultDecantTemplate();

  const mapping =
  state.comboProducts.find(
    row =>
    Number(
      row.combo_id
    ) ===
    Number(
      template.id
    )
    &&
    Number(
      row.product_id
    ) ===
    Number(
      productId
    )
  );

  const allowed =
  mapping
  ?
  arrayFromDb(
    mapping.ml_opciones
  )
  .map(
    value =>
    asNumber(
      value,
      0
    )
  )
  .filter(
    value =>
    value > 0 &&
    value <= 30
  )
  :
  state.decantSizes
  .map(
    row =>
    asNumber(
      row.ml,
      0
    )
  )
  .filter(
    value =>
    value > 0 &&
    value <= 30
  );

  return uniqueStrings(
    allowed
  )
  .map(
    value =>
    asNumber(
      value,
      0
    )
  )
  .filter(
    value =>
    value > 0
  )
  .sort(
    (
      a,
      b
    ) =>
    a - b
  );
}

async function calculateDecantPrice(
  productId,
  ml
)
{
  const rpc =
  await supabaseClient.rpc(
    "calculate_decant_price",
    {
      p_product_id:
      Number(
        productId
      ),

      p_ml:
      Number(
        ml
      ),
    }
  );

  if (
    !rpc.error &&
    rpc.data !== null &&
    rpc.data !== undefined
  )
  {
    return asNumber(
      rpc.data,
      0
    );
  }

  const product =
  getProductById(
    productId
  );

  if (
    !product ||
    product.ml <= 0
  )
  {
    throw new Error(
      "No se pudo calcular el precio del decant."
    );
  }

  const sizeRow =
  state.decantSizes.find(
    row =>
    Number(
      row.ml
    ) ===
    Number(
      ml
    )
  )
  ||
  {
    factor:
    1,

    costo_envase:
    0,
  };

  const proportional =
  (
    product.precio /
    product.ml
  )
  *
  Number(
    ml
  )
  *
  asNumber(
    sizeRow.factor,
    1
  )
  +
  asNumber(
    sizeRow.costo_envase,
    0
  );

  return Math.ceil(
    proportional /
    100
  )
  *
  100;
}

function renderDecantBuilderPage()
{
  const template =
  getDefaultDecantTemplate();

  const products =
  getDecantEligibleProducts();

  const maxProducts =
  Math.max(
    1,
    asNumber(
      template.max_productos,
      5
    )
  );

  return `
    <section class="section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("decants.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("decants.title"))}
            </h1>

            <p class="section-subtitle">
              ${escapeHtml(t("decants.description"))}
            </p>
          </div>
        </div>

        <div
          class="builder-layout"
          data-decant-max="${maxProducts}">
          <div class="builder-panel">
            <div class="builder-list">
              ${products
                .map(
                  product =>
                  renderDecantProductRow(
                    product
                  )
                )
                .join("")
              }
            </div>
          </div>

          <aside class="builder-panel sticky">
            <p class="eyebrow">
              ${escapeHtml(t("decants.selection"))}
            </p>

            <div id="decantDraftSummary">
              ${renderDecantDraftSummary()}
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function renderDecantProductRow(
  product
)
{
  const image =
  getProductMainImage(
    product
  );

  const sizes =
  getDecantSizeRowsForProduct(
    product.id
  );

  return `
    <article class="builder-product">
      <div class="builder-product-image">
        ${image
          ?
          `
            <img
              src="${escapeAttribute(image)}"
              alt="${escapeAttribute(product.nombre)}"
              loading="lazy"
              decoding="async">
          `
          :
          "✦"
        }
      </div>

      <div>
        <h4>
          ${escapeHtml(product.nombre)}
        </h4>

        <div class="cart-line-meta">
          ${escapeHtml(product.marca || product.categoria)}
        </div>

        <div class="u-mt-8">
          <select
            class="select-input"
            id="decantSize-${product.id}"
            aria-label="${escapeAttribute(t("decants.size"))}">
            ${sizes
              .map(
                ml =>
                `
                  <option value="${ml}">
                    ${ml} ml
                  </option>
                `
              )
              .join("")
            }
          </select>
        </div>
      </div>

      <button
        class="btn small"
        type="button"
        data-action="add-decant"
        data-product-id="${product.id}">
        ${escapeHtml(t("decants.add"))}
      </button>
    </article>
  `;
}

function renderDecantDraftSummary()
{
  if (
    state.decantDraft.length === 0
  )
  {
    return `
      <div class="empty-state">
        <h3>
          ${escapeHtml(t("decants.empty"))}
        </h3>
      </div>
    `;
  }

  const total =
  state.decantDraft.reduce(
    (
      sum,
      item
    ) =>
    sum +
    asNumber(
      item.price,
      0
    ),
    0
  );

  return `
    ${state.decantDraft
      .map(
        (
          item,
          index
        ) =>
        {
          const product =
          getProductById(
            item.productId
          );

          return `
            <div class="builder-summary-item">
              <span>
                ${escapeHtml(product?.nombre || "Perfume")}
                ·
                ${item.ml} ml
              </span>

              <span>
                ${money(item.price)}

                <button
                  type="button"
                  style="border:0;background:transparent;color:var(--danger)"
                  data-action="remove-decant"
                  data-index="${index}">
                  ×
                </button>
              </span>
            </div>
          `;
        }
      )
      .join("")
    }

    <div class="builder-total">
      <span>
        ${escapeHtml(t("decants.total"))}
      </span>

      <strong>
        ${money(total)}
      </strong>
    </div>

    <button
      class="btn u-mt-14"
      style="width:100%"
      type="button"
      data-action="add-decant-bundle-to-cart">
      ${escapeHtml(t("decants.cart"))}
    </button>
  `;
}

async function addDecantToDraft(
  productId
)
{
  const template =
  getDefaultDecantTemplate();

  const max =
  Math.max(
    1,
    asNumber(
      template.max_productos,
      5
    )
  );

  if (
    state.decantDraft.length >= max
  )
  {
    toast(
      t(
        "decants.limit"
      ),
      "error"
    );

    return;
  }

  const select =
  document.getElementById(
    "decantSize-" +
    productId
  );

  const ml =
  asNumber(
    select?.value,
    0
  );

  if (
    ml <= 0 ||
    ml > 30
  )
  {
    return;
  }

  try
  {
    const price =
    await calculateDecantPrice(
      productId,
      ml
    );

    state.decantDraft.push(
      {
        productId:
        Number(
          productId
        ),

        ml:
        ml,

        price:
        price,
      }
    );

    updateDecantSummaryOnly();
  }
  catch (
    error
  )
  {
    toast(
      error.message,
      "error"
    );
  }
}

function updateDecantSummaryOnly()
{
  const host =
  document.getElementById(
    "decantDraftSummary"
  );

  if (
    host
  )
  {
    host.innerHTML =
    renderDecantDraftSummary();
  }
}

function addDecantBundleToCart()
{
  if (
    state.decantDraft.length === 0
  )
  {
    return;
  }

  const items =
  state.decantDraft.map(
    item =>
    ({
      ...item,
    })
  );

  const total =
  items.reduce(
    (
      sum,
      item
    ) =>
    sum +
    asNumber(
      item.price,
      0
    ),
    0
  );

  const first =
  items[0]
  ?
  getProductById(
    items[0].productId
  )
  :
  null;

  state.cart.push(
    {
      kind:
      "bundle",

      bundleType:
      "decant",

      key:
      makeId(
        "decant"
      ),

      title:
      t(
        "decants.title"
      ),

      qty:
      1,

      unitPrice:
      total,

      items:
      items,

      image:
      first
      ?
      getProductMainImage(
        first
      )
      :
      "",
    }
  );

  state.decantDraft =
  [];

  saveLocalState();

  toast(
    state.language === "en"
    ?
    "Decant set added to cart."
    :
    "Combo de decants agregado al carrito."
  );

  renderCurrentRoute();

  openCart();
}

function getCurrentGiftOption()
{
  return state.giftOptions.find(
    option =>
    option.slug ===
    state.selectedGiftOption
  )
  ||
  state.giftOptions[0]
  ||
  {
    slug:
    "clasico",

    nombre_es:
    "Regalo Clásico",

    nombre_en:
    "Classic Gift",

    precio_adicional:
    0,

    max_productos:
    4,
  };
}

function getGiftEligibleProducts()
{
  return state.products.filter(
    product =>
    product.stock > 0
  );
}

function renderGiftBuilderPage()
{
  const option =
  getCurrentGiftOption();

  const products =
  getGiftEligibleProducts();

  return `
    <section class="section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("gifts.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("gifts.title"))}
            </h1>

            <p class="section-subtitle">
              ${escapeHtml(t("gifts.description"))}
            </p>
          </div>
        </div>

        <div class="builder-layout">
          <div class="builder-panel">
            <div class="admin-field u-mb-16">
              <label for="giftOption">
                ${escapeHtml(t("gifts.occasion"))}
              </label>

              <select
                id="giftOption"
                class="select-input">
                ${state.giftOptions
                  .map(
                    item =>
                    `
                      <option
                        value="${escapeAttribute(item.slug)}"
                        ${item.slug === option.slug ? "selected" : ""}>
                        ${escapeHtml(
                          state.language === "en"
                          ?
                          item.nombre_en
                          :
                          item.nombre_es
                        )}
                      </option>
                    `
                  )
                  .join("")
                }
              </select>
            </div>

            <div class="builder-list">
              ${products
                .map(
                  product =>
                  renderGiftProductRow(
                    product
                  )
                )
                .join("")
              }
            </div>
          </div>

          <aside class="builder-panel sticky">
            <p class="eyebrow">
              ${escapeHtml(t("gifts.selection"))}
            </p>

            <h3
              style="
                margin:0 0 12px;
                font-family:var(--serif);
                font-size:25px;
                font-weight:400;
              ">
              ${escapeHtml(
                state.language === "en"
                ?
                option.nombre_en
                :
                option.nombre_es
              )}
            </h3>

            <div id="giftDraftSummary">
              ${renderGiftDraftSummary()}
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function renderGiftProductRow(
  product
)
{
  const image =
  getProductMainImage(
    product
  );

  return `
    <article class="builder-product">
      <div class="builder-product-image">
        ${image
          ?
          `
            <img
              src="${escapeAttribute(image)}"
              alt="${escapeAttribute(product.nombre)}"
              loading="lazy"
              decoding="async">
          `
          :
          "✦"
        }
      </div>

      <div>
        <h4>
          ${escapeHtml(product.nombre)}
        </h4>

        <div class="cart-line-meta">
          ${escapeHtml(product.tipo_producto || product.categoria)}
        </div>

        <strong class="u-mt-6" style="display:block;font-size:11px">
          ${money(product.precio)}
        </strong>
      </div>

      <button
        class="btn small"
        type="button"
        data-action="add-gift-product"
        data-product-id="${product.id}">
        +
      </button>
    </article>
  `;
}

function renderGiftDraftSummary()
{
  const option =
  getCurrentGiftOption();

  const extra =
  asNumber(
    option.precio_adicional,
    0
  );

  if (
    state.giftDraft.length === 0
  )
  {
    return `
      <div class="empty-state">
        <h3>
          ${escapeHtml(t("gifts.empty"))}
        </h3>

        ${extra > 0
          ?
          `
            <p>
              ${state.language === "en" ? "Presentation" : "Presentación"}:
              ${money(extra)}
            </p>
          `
          :
          ""
        }
      </div>
    `;
  }

  const productsTotal =
  state.giftDraft.reduce(
    (
      sum,
      item
    ) =>
    sum +
    asNumber(
      item.price,
      0
    ),
    0
  );

  const total =
  productsTotal +
  extra;

  return `
    ${state.giftDraft
      .map(
        (
          item,
          index
        ) =>
        {
          const product =
          getProductById(
            item.productId
          );

          return `
            <div class="builder-summary-item">
              <span>
                ${escapeHtml(product?.nombre || "Producto")}
              </span>

              <span>
                ${money(item.price)}

                <button
                  type="button"
                  style="border:0;background:transparent;color:var(--danger)"
                  data-action="remove-gift-product"
                  data-index="${index}">
                  ×
                </button>
              </span>
            </div>
          `;
        }
      )
      .join("")
    }

    ${extra > 0
      ?
      `
        <div class="builder-summary-item">
          <span>
            ${state.language === "en" ? "Gift presentation" : "Presentación de regalo"}
          </span>

          <strong>
            ${money(extra)}
          </strong>
        </div>
      `
      :
      ""
    }

    <div class="builder-total">
      <span>
        ${escapeHtml(t("cart.total"))}
      </span>

      <strong>
        ${money(total)}
      </strong>
    </div>

    <button
      class="btn u-mt-14"
      style="width:100%"
      type="button"
      data-action="add-gift-bundle-to-cart">
      ${escapeHtml(t("gifts.cart"))}
    </button>
  `;
}

function addGiftProductToDraft(
  productId
)
{
  const option =
  getCurrentGiftOption();

  const max =
  Math.max(
    1,
    asNumber(
      option.max_productos,
      4
    )
  );

  if (
    state.giftDraft.length >= max
  )
  {
    toast(
      t(
        "gifts.limit"
      ),
      "error"
    );

    return;
  }

  const product =
  getProductById(
    productId
  );

  if (
    !product
  )
  {
    return;
  }

  state.giftDraft.push(
    {
      productId:
      product.id,

      price:
      product.precio,
    }
  );

  updateGiftSummaryOnly();
}

function updateGiftSummaryOnly()
{
  const host =
  document.getElementById(
    "giftDraftSummary"
  );

  if (
    host
  )
  {
    host.innerHTML =
    renderGiftDraftSummary();
  }
}

function addGiftBundleToCart()
{
  if (
    state.giftDraft.length === 0
  )
  {
    return;
  }

  const option =
  getCurrentGiftOption();

  const items =
  state.giftDraft.map(
    item =>
    ({
      ...item,
    })
  );

  const total =
  items.reduce(
    (
      sum,
      item
    ) =>
    sum +
    asNumber(
      item.price,
      0
    ),
    0
  )
  +
  asNumber(
    option.precio_adicional,
    0
  );

  const first =
  items[0]
  ?
  getProductById(
    items[0].productId
  )
  :
  null;

  state.cart.push(
    {
      kind:
      "bundle",

      bundleType:
      "gift",

      key:
      makeId(
        "gift"
      ),

      title:
      t(
        "gifts.title"
      ),

      optionSlug:
      option.slug,

      optionName:
      state.language === "en"
      ?
      option.nombre_en
      :
      option.nombre_es,

      qty:
      1,

      unitPrice:
      total,

      items:
      items,

      image:
      first
      ?
      getProductMainImage(
        first
      )
      :
      "",
    }
  );

  state.giftDraft =
  [];

  saveLocalState();

  toast(
    state.language === "en"
    ?
    "Gift added to cart."
    :
    "Regalo agregado al carrito."
  );

  renderCurrentRoute();

  openCart();
}

