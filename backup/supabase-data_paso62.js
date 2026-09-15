"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: carga secundaria de datos y configuración desde Supabase

async function loadPopularity()
{
  state.popularity =
  new Map();

  const result =
  await supabaseClient
    .from(
      "product_popularity"
    )
    .select(
      "product_id,cart_adds"
    );

  if (
    result.error
  )
  {
    console.warn(
      "product_popularity:",
      result.error.message
    );

    return;
  }

  for (
    const row of
    result.data
    ||
    []
  )
  {
    state.popularity.set(
      asNumber(
        row.product_id,
        0
      ),
      asNumber(
        row.cart_adds,
        0
      )
    );
  }
}

async function loadSiteSettings()
{
  state.siteSettings =
  {};

  const result =
  await supabaseClient
    .from(
      "site_settings"
    )
    .select(
      "key,value"
    );

  if (
    result.error
  )
  {
    console.warn(
      "site_settings:",
      result.error.message
    );

    return;
  }

  for (
    const row of
    result.data
    ||
    []
  )
  {
    state.siteSettings[
      row.key
    ] =
    row.value
    ||
    {};
  }
}


function getSiteCoverUrl(
  slot
)
{
  return (
    state.siteCoverMeta?.[slot]?.url
    ||
    ""
  );
}

function getSiteCoverPath(
  slot
)
{
  return (
    state.siteCoverMeta?.[slot]?.path
    ||
    ""
  );
}

function normalizeCoverPosition(
  value
)
{
  const safe =
  String(
    value || "center"
  )
  .toLowerCase();

  if (
    safe === "left" ||
    safe === "right"
  )
  {
    return safe;
  }

  return "center";
}

function getSiteCoverPosition(
  slot
)
{
  const positions =
  getSiteSettingObject(
    "cover_positions"
  );

  return normalizeCoverPosition(
    positions?.[slot]
  );
}

function coverPositionCss(
  value
)
{
  const position =
  normalizeCoverPosition(
    value
  );

  if (position === "left")
  {
    return "left center";
  }

  if (position === "right")
  {
    return "right center";
  }

  return "center center";
}

function getCollectionCoverUrl(
  slug
)
{
  return (
    state.collectionCoverMeta?.[slug]?.url
    ||
    ""
  );
}

function getCollectionCoverPath(
  slug
)
{
  return (
    state.collectionCoverMeta?.[slug]?.path
    ||
    ""
  );
}


async function loadSeasonalVideoUrl()
{
  state.seasonalVideoMeta =
  {
    path:
    "",

    url:
    "",
  };

  const video =
  getSiteSettingObject(
    "seasonal_video"
  );

  const raw =
  video.path
  ||
  video.url
  ||
  "";

  if (
    !raw
  )
  {
    return;
  }

  state.seasonalVideoMeta =
  await resolveImageValue(
    raw
  );
}

function getSeasonalVideoUrl()
{
  return (
    state.seasonalVideoMeta?.url
    ||
    ""
  );
}

function getSeasonalVideoPath()
{
  return (
    state.seasonalVideoMeta?.path
    ||
    ""
  );
}

async function loadSiteCoverUrls()
{
  state.siteCoverMeta = {};
  state.collectionCoverMeta = {};

  const covers =
  getSiteSettingObject(
    "cover_images"
  );

  const collectionCovers =
  getSiteSettingObject(
    "collection_covers"
  );

  for (
    const [slot, raw] of
    Object.entries(
      covers || {}
    )
  )
  {
    if (!raw)
    {
      continue;
    }

    state.siteCoverMeta[slot] =
    await resolveImageValue(
      raw
    );
  }

  for (
    const [slug, raw] of
    Object.entries(
      collectionCovers || {}
    )
  )
  {
    if (!raw)
    {
      continue;
    }

    state.collectionCoverMeta[slug] =
    await resolveImageValue(
      raw
    );
  }
}

function renderPageCoverBanner(
  slot,
  eyebrow,
  title,
  description = ""
)
{
  const image =
  getSiteCoverUrl(
    slot
  );

  if (!image)
  {
    return "";
  }

  return `
    <div class="page-cover-banner">
      <div class="page-cover-banner-copy">
        <p class="eyebrow">
          ${escapeHtml(eyebrow || "AromaLParfum")}
        </p>

        <h2 class="section-title">
          ${escapeHtml(title || "AromaLParfum")}
        </h2>

        ${description
          ?
          `
            <p class="section-subtitle">
              ${escapeHtml(description)}
            </p>
          `
          :
          ""
        }
      </div>

      <div class="page-cover-banner-media">
        <img
          src="${escapeAttribute(image)}"
          alt="${escapeAttribute(title || "AromaLParfum")}"
          style="object-position:${escapeAttribute(coverPositionCss(getSiteCoverPosition(slot)))}">
      </div>
    </div>
  `;
}

async function loadCollections()
{
  const result =
  await supabaseClient
    .from(
      "thematic_collections"
    )
    .select(
      "id,slug,nombre_es,nombre_en,descripcion_es,descripcion_en,tipo,estacion,ocasion,emoji,orden,activo"
    )
    .eq(
      "activo",
      true
    )
    .order(
      "orden",
      {
        ascending:
        true,
      }
    );

  if (
    result.error
  )
  {
    console.warn(
      "thematic_collections:",
      result.error.message
    );

    state.collections =
    CONFIG.collectionFallbacks;

    return;
  }

  state.collections =
  (
    result.data
    &&
    result.data.length
  )
  ?
  result.data
  :
  CONFIG.collectionFallbacks;
}

async function loadGameConfigs()
{
  const result =
  await supabaseClient
    .from(
      "aroma_games"
    )
    .select(
      "id,tipo,tiempo_limite,piezas,diferencias,orden,activo"
    )
    .eq(
      "activo",
      true
    )
    .order(
      "orden",
      {
        ascending:
        true,
      }
    );

  if (
    result.error
  )
  {
    console.warn(
      "aroma_games:",
      result.error.message
    );

    state.gameConfigs =
    [];

    return;
  }

  state.gameConfigs =
  result.data
  ||
  [];
}

async function loadProductTypes()
{
  const result =
  await supabaseClient
    .from(
      "product_types"
    )
    .select(
      "slug,nombre_es,nombre_en,grupo,orden,activo"
    )
    .eq(
      "activo",
      true
    )
    .order(
      "orden",
      {
        ascending:
        true,
      }
    );

  if (
    result.error
  )
  {
    console.warn(
      "product_types:",
      result.error.message
    );

    state.productTypes =
    [];

    return;
  }

  state.productTypes =
  result.data
  ||
  [];
}

async function loadComboTemplates()
{
  const result =
  await supabaseClient
    .from(
      "combo_templates"
    )
    .select(
      "id,nombre,tipo,max_productos,activo"
    )
    .eq(
      "activo",
      true
    );

  if (
    result.error
  )
  {
    console.warn(
      "combo_templates:",
      result.error.message
    );

    state.comboTemplates =
    [];

    return;
  }

  state.comboTemplates =
  result.data
  ||
  [];
}

async function loadComboProducts()
{
  const result =
  await supabaseClient
    .from(
      "combo_products"
    )
    .select(
      "combo_id,product_id,ml_opciones,activo"
    )
    .eq(
      "activo",
      true
    );

  if (
    result.error
  )
  {
    console.warn(
      "combo_products:",
      result.error.message
    );

    state.comboProducts =
    [];

    return;
  }

  state.comboProducts =
  result.data
  ||
  [];
}

async function loadDecantSizes()
{
  const result =
  await supabaseClient
    .from(
      "decant_sizes"
    )
    .select(
      "ml,factor,costo_envase,orden,activo"
    )
    .eq(
      "activo",
      true
    )
    .order(
      "orden",
      {
        ascending:
        true,
      }
    );

  if (
    result.error
  )
  {
    console.warn(
      "decant_sizes:",
      result.error.message
    );

    state.decantSizes =
    CONFIG.defaultDecantSizes.map(
      (
        ml,
        index
      ) =>
      ({
        ml:
        ml,

        factor:
        1,

        costo_envase:
        0,

        orden:
        index + 1,
      })
    );

    return;
  }

  state.decantSizes =
  (
    result.data
    &&
    result.data.length
  )
  ?
  result.data
  :
  CONFIG.defaultDecantSizes.map(
    (
      ml,
      index
    ) =>
    ({
      ml:
      ml,

      factor:
      1,

      costo_envase:
      0,

      orden:
      index + 1,
    })
  );
}

async function loadGiftOptions()
{
  // Paso 42: una sola llamada trae presentación, extras y settings.
  // Si el RPC falla, mantenemos el fallback anterior.
  try
  {
    const rpcResult = await supabaseClient.rpc(
      "get_gift_builder_config"
    );

    if (!rpcResult.error && rpcResult.data)
    {
      const payload = rpcResult.data || {};

      state.giftBuilderSettings =
      (payload.settings && typeof payload.settings === "object")
      ? payload.settings
      : {};

      state.giftOptions = Array.isArray(payload.presentations)
      ? payload.presentations.map(item => ({
          slug: item.slug,
          nombre_es: item.name_es || item.nombre_es || item.slug,
          nombre_en: item.name_en || item.nombre_en || item.name_es || item.slug,
          precio_adicional: asNumber(item.price ?? item.precio_adicional, 0),
          max_productos: Math.max(1, asNumber(item.max_products ?? item.max_productos, 4)),
          orden: asNumber(item.order ?? item.orden, 0),
          activo: true,
        }))
      : [];

      state.giftAddons = Array.isArray(payload.addons)
      ? payload.addons.map(item => ({
          slug: item.slug,
          addon_type: item.type || item.addon_type || "other",
          nombre_es: item.name_es || item.nombre_es || item.slug,
          nombre_en: item.name_en || item.nombre_en || item.name_es || item.slug,
          descripcion_es: item.description_es || item.descripcion_es || "",
          precio_adicional: asNumber(item.price ?? item.precio_adicional, 0),
          destacado: Boolean(item.featured ?? item.destacado),
          orden: asNumber(item.order ?? item.orden, 0),
          activo: true,
        }))
      : [];

      if (!state.selectedGiftOption && state.giftOptions.length)
      {
        state.selectedGiftOption = state.giftOptions[0].slug;
      }

      return;
    }

    if (rpcResult.error)
    {
      console.warn("get_gift_builder_config:", rpcResult.error.message);
    }
  }
  catch (error)
  {
    console.warn("gift builder config:", error);
  }

  const result = await supabaseClient
    .from("gift_options")
    .select("slug,nombre_es,nombre_en,precio_adicional,max_productos,orden,activo")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (result.error)
  {
    console.warn("gift_options:", result.error.message);
    state.giftOptions = [];
    state.giftAddons = [];
    return;
  }

  state.giftOptions = result.data || [];
  state.giftAddons = [];

  if (!state.selectedGiftOption && state.giftOptions.length)
  {
    state.selectedGiftOption = state.giftOptions[0].slug;
  }
}

async function loadAllData()
{
  state.loading =
  true;

  state.lastError =
  null;

  setAppLoading(
    t(
      "common.loading"
    )
  );

  try
  {
    await Promise.all(
      [
        loadProducts(),
        loadSiteSettings(),
        loadPopularity(),
        loadCollections(),
        loadGameConfigs(),
        loadDailyLeaderboard(),
        loadProductTypes(),
        loadComboTemplates(),
        loadComboProducts(),
        loadDecantSizes(),
        loadGiftOptions(),
        document.body?.dataset.entry === "admin"
          ? Promise.resolve()
          : loadHomeMerchandising(),
      ]
    );

    await loadMainProductImages();

    await Promise.all(
      [
        loadSiteCoverUrls(),
        loadSeasonalVideoUrl(),
      ]
    );

    state.loading =
    false;

    applyLanguageToChrome();

    renderCurrentRoute();
  }
  catch (
    error
  )
  {
    state.loading =
    false;

    state.lastError =
    error;

    console.error(
      "Error inicializando AromaLParfum:",
      error
    );

    const app =
    document.getElementById(
      "app"
    );

    if (
      app
    )
    {
      app.innerHTML =
      `
        <section class="section">
          <div class="container">
            <div class="empty-state">
              <h3>
                No se pudo cargar AromaLParfum
              </h3>
              <p>
                ${escapeHtml(error?.message || "Error desconocido")}
              </p>
              <button
                class="btn"
                type="button"
                data-action="reload-data">
                ${escapeHtml(t("common.retry"))}
              </button>
            </div>
          </div>
        </section>
      `;
    }
  }
}

